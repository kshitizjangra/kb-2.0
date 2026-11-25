"""Newsletter orchestration: confirmed opt-ins and free SendPulse campaigns."""
import base64
import hashlib
import hmac
from contextlib import contextmanager
from datetime import timedelta
from decimal import Decimal, InvalidOperation
from html import escape

from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from django.utils.html import strip_tags

from .models import NewsletterIssue, NewsletterSendAttempt, SiteSetting, Subscriber
from .sendpulse import NewsletterError, SendPulse, configured

FREE_SUBSCRIBERS = 500
FREE_EMAILS = 15000
FREE_WELCOME_EMAILS = 12000
CAMPAIGNS_PER_HOUR = 4


@contextmanager
def delivery_lock():
    """Serialize account-wide quota reservations across serverless instances."""
    with transaction.atomic(using='default'):
        SiteSetting.objects.using('default').get_or_create(key='newsletter_delivery_lock', defaults={'value': ''})
        SiteSetting.objects.using('default').select_for_update().get(key='newsletter_delivery_lock')
        yield


def _number(value):
    try:
        if isinstance(value, bool) or int(value) != Decimal(str(value)) or int(value) < 0:
            raise ValueError
        return int(value)
    except (ValueError, TypeError, OverflowError, InvalidOperation):
        raise NewsletterError('Could not verify SendPulse limits. Sending is paused until the account returns valid quota information.', status=503) from None


def account_status(client):
    data = client.balance()
    email = data.get('email', {}) if isinstance(data, dict) else {}
    email = email if isinstance(email, dict) else {}
    used = _number(email.get('current_subscribers'))
    maximum = _number(email.get('maximum_subscribers'))
    left = _number(email.get('emails_left'))
    # Fail closed on unlimited/paid capacity, rather than accidentally charging
    # a balance on an account that was switched away from the free tier.
    if maximum != FREE_SUBSCRIBERS or left > FREE_EMAILS or used > FREE_SUBSCRIBERS:
        raise NewsletterError('Use the SendPulse Free plan (500 subscribers / 15,000 emails). Paid or unverified capacity is disabled here.')
    senders = client.senders()
    verified = isinstance(senders, list) and any(
        str(s.get('email', '')).casefold() == settings.SENDPULSE_SENDER_EMAIL.casefold()
        and str(s.get('status', '')).casefold() == 'active'
        for s in senders if isinstance(s, dict)
    )
    if not verified:
        raise NewsletterError('Verify and activate SENDPULSE_SENDER_EMAIL in the SendPulse dashboard before subscribing or sending.')
    welcome_ready = False
    welcome_error = ''
    try:
        _welcome_limits(data, senders)
        welcome_ready = True
    except NewsletterError as exc:
        welcome_error = str(exc)
    return {'subscribersUsed': used, 'subscriberLimit': FREE_SUBSCRIBERS,
            'emailsLeft': left, 'monthlyLimit': FREE_EMAILS,
            'senderEmail': settings.SENDPULSE_SENDER_EMAIL, 'senderName': settings.SENDPULSE_SENDER_NAME,
            'welcomeReady': welcome_ready, 'welcomeError': welcome_error}


def _welcome_limits(data, senders):
    smtp = data.get('smtp') if isinstance(data, dict) else None
    if not isinstance(smtp, dict) or str(smtp.get('tariff_name', '')).casefold() != 'smtp free':
        raise NewsletterError('Activate the free SMTP service in SendPulse for automatic welcome emails. Weekly campaigns use the separate Email service.')
    if _number(smtp.get('email_qty')) > FREE_WELCOME_EMAILS:
        raise NewsletterError('Welcome emails require the SMTP Free plan; paid capacity is disabled.')
    remaining = _number(smtp.get('email_qty_left'))
    if remaining < 1:
        raise NewsletterError('The free welcome-email allowance is used up. Welcome emails will wait for its next reset.')
    hourly = min(50, _number(smtp.get('qty_per_hour')))
    if remaining > FREE_WELCOME_EMAILS or not hourly:
        raise NewsletterError('Could not verify the free welcome-email allowance.')
    if not isinstance(senders, list) or not any(
        isinstance(s, dict) and str(s.get('email', '')).casefold() == settings.SENDPULSE_SENDER_EMAIL.casefold()
        and s.get('is_allowed_for_smtp') is True and str(s.get('status', '')).casefold() == 'active'
        for s in senders
    ):
        raise NewsletterError('The verified sender must also be enabled for SendPulse SMTP to send welcome emails.')
    if not settings.DEBUG and (not settings.SITE_URL.startswith('https://') or 'localhost' in settings.SITE_URL):
        raise NewsletterError('Set SITE_URL to your public HTTPS backend URL so welcome-email unsubscribe links work.')
    return remaining, hourly


def welcome_confirmed_subscribers(client):
    """Free SMTP welcome outbox. A timeout is never automatically replayed."""
    now = timezone.now()
    Subscriber.objects.using('default').filter(welcome_status='submitting', welcome_requested_at__lt=now - timedelta(minutes=2)).update(welcome_status='review')
    candidates = Subscriber.objects.using('default').filter(
        is_active=True, status='active', unsubscribe_pending=False, consent_at__isnull=False,
        confirmed_at__isnull=False, welcome_status__in=['pending', 'failed'], welcome_attempts__lt=3,
    ).order_by('created_at')[:5]
    if not candidates.exists():
        return
    try:
        remaining, hourly = _welcome_limits(client.balance(), client.senders())
    except NewsletterError:
        return
    for candidate in candidates:
        with delivery_lock():
            row = Subscriber.objects.using('default').select_for_update().filter(pk=candidate.pk).first()
            if row is None:
                continue
            if row.welcome_status not in ('pending', 'failed') or not row.is_active or row.unsubscribe_pending:
                continue
            if row.welcome_requested_at and row.welcome_requested_at > now - timedelta(minutes=15):
                continue
            hour_used = Subscriber.objects.using('default').filter(welcome_requested_at__gte=now - timedelta(hours=1)).aggregate(total=Sum('welcome_attempts'))['total'] or 0
            uncertain = Subscriber.objects.using('default').filter(welcome_status__in=['submitting', 'review']).count()
            if hour_used >= hourly or remaining <= uncertain:
                break
            row.welcome_status, row.welcome_requested_at = 'submitting', now
            row.welcome_attempts += 1
            row.save(update_fields=['welcome_status', 'welcome_requested_at', 'welcome_attempts'])
        greeting = f'Hi {escape(row.name)},' if row.name else 'Hi there,'
        body = (f'<p>{greeting}</p><p>Thanks for joining. Har week, I’ll share one honest story, '
                'one practical lesson and one small thing you can try.</p><p>Expect notes on personal branding, '
                'writing, confidence and figuring out your career. Your first weekly issue will arrive soon.</p>')
        html = email_html(body).replace('{{unsubscribe_url}}', escape(unsubscribe_url(row.email), quote=True))
        try:
            provider_id = client.welcome(row, html)
        except NewsletterError as exc:
            row.welcome_status = 'review' if exc.uncertain or row.welcome_attempts >= 3 else 'failed'
            row.save(update_fields=['welcome_status'])
            continue
        row.welcome_status, row.welcome_provider_id = 'queued', provider_id
        row.save(update_fields=['welcome_status', 'welcome_provider_id'])
        remaining -= 1


def signup(email, name='', source='newsletter'):
    client = SendPulse()
    now = timezone.now()
    with delivery_lock():
        existing = Subscriber.objects.using('default').filter(email=email).first()
        # A repeat submission never reactivates an unsubscribed or suppressed
        # address, nor sends another confirmation within the cooldown window.
        if existing and (existing.status in ('active', 'unsubscribed', 'suppressed') or existing.unsubscribe_pending):
            return
        if existing and existing.confirmation_requested_at and existing.confirmation_requested_at > now - timedelta(minutes=15):
            return
        limits = account_status(client)
        if limits['emailsLeft'] < 1:
            raise NewsletterError('This month’s free email allowance is used up. Please try again after it resets.')
        local_count = Subscriber.objects.using('default').filter(consent_at__isnull=False, status__in=['active', 'pending']).count()
        if (not existing or not existing.consent_at) and (local_count >= FREE_SUBSCRIBERS or limits['subscribersUsed'] >= FREE_SUBSCRIBERS):
            raise NewsletterError('The newsletter’s free subscriber capacity is full. Please check back later.')
        # Provider sends the confirmation. Only status 1 read from the provider
        # can subsequently activate the local record.
        client.subscribe(email, name)
        Subscriber.objects.using('default').update_or_create(email=email, defaults={
            'name': name, 'status': 'pending', 'is_active': False, 'source': source,
            'consent_at': now, 'confirmation_requested_at': now, 'provider_status': 2,
        })


def unsubscribe(email):
    with delivery_lock():
        Subscriber.objects.using('default').filter(email=email).update(
            is_active=False, status='unsubscribed', unsubscribe_pending=True,
        )
    # Persist local suppression first, so an outage cannot silently undo it.
    if configured():
        SendPulse().unsubscribe(email)
        Subscriber.objects.using('default').filter(email=email).update(unsubscribe_pending=False)


def sync_subscribers(client):
    for row in Subscriber.objects.using('default').filter(unsubscribe_pending=True):
        client.unsubscribe(row.email)
        Subscriber.objects.using('default').filter(pk=row.pk).update(unsubscribe_pending=False)
    contacts = {str(row.get('email', '')).strip().casefold(): row for row in client.contacts() if isinstance(row, dict)}
    now = timezone.now()
    with delivery_lock():
        for row in Subscriber.objects.using('default').all():
            contact = contacts.get(row.email.casefold())
            if row.unsubscribe_pending or row.status == 'unsubscribed':
                # A local opt-out wins over stale provider activation data.
                continue
            code = contact.get('status') if contact else None
            if code == 1 and row.consent_at:
                row.status = 'active'
                row.confirmed_at = row.confirmed_at or now
            elif code in (4, 6, 13):
                row.status = 'unsubscribed'
            elif code in (5, 8, 9, 10, 11, 12, 14):
                row.status = 'suppressed'
            else:
                row.status = 'pending'
            row.is_active = row.status == 'active'
            row.provider_status = code
            row.save(update_fields=['status', 'is_active', 'confirmed_at', 'provider_status'])


def email_html(body_html, *, preview=False):
    footer_link = '#' if preview else '{{unsubscribe_url}}'
    return (
        '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src https: data:">'
        '</head><body style="margin:0;background:#f5f0eb;padding:24px 12px;">'
        '<div style="max-width:600px;margin:auto;background:#fff;padding:28px;border-radius:12px;'
        'font-family:Arial,sans-serif;color:#222;font-size:16px;line-height:1.7;overflow-wrap:anywhere;">'
        '<p style="font-size:12px;letter-spacing:2px;color:#b8176d;">A NOTE FROM KAMNA</p>'
        f'{body_html}'
        '<p>With love,<br><strong>Kamna</strong></p><hr>'
        '<p style="font-size:12px;color:#666;">You signed up for weekly notes on personal branding, '
        f'career and building in public. <a href="{footer_link}">Unsubscribe</a> anytime.</p>'
        '</div></body></html>'
    )


def _free_quote(client, limits, is_test):
    quote = client.cost()
    if not isinstance(quote, dict) or quote.get('result') is not True:
        raise NewsletterError('Could not verify the campaign cost. Sending is paused.')
    try:
        paid = Decimal(str(quote.get('overdraftAllEmailsPrice')))
        balance_addresses = _number(quote.get('addressesDeltaFromBalance'))
    except (InvalidOperation, TypeError):
        raise NewsletterError('Could not verify that this campaign is free.') from None
    if not paid.is_finite() or paid != 0 or balance_addresses != 0:
        raise NewsletterError('This send would use paid capacity. Sending is blocked; keep the account on the Free plan.')
    count = 1 if is_test else _number(quote.get('sent_emails_qty'))
    if count < 1:
        raise NewsletterError('No confirmed, deliverable subscribers yet. Sync after someone confirms their email.')
    if count > FREE_SUBSCRIBERS or count > limits['emailsLeft']:
        raise NewsletterError('This send exceeds the free plan’s remaining allowance.')
    now = timezone.now()
    attempts = NewsletterSendAttempt.objects.using('default')
    if attempts.filter(created_at__gte=now - timedelta(hours=1)).count() >= CAMPAIGNS_PER_HOUR:
        raise NewsletterError('SendPulse allows four campaigns per hour, including tests. Please wait before sending another.')
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    used = attempts.filter(created_at__gte=month_start).exclude(status='failed').aggregate(total=Sum('reserved_count'))['total'] or 0
    pending = attempts.filter(status__in=['creating', 'unknown']).aggregate(total=Sum('reserved_count'))['total'] or 0
    if used + count > FREE_EMAILS or pending + count > limits['emailsLeft']:
        raise NewsletterError('Free email allowance is already used or reserved by another send. Sync before retrying.')
    return count


def submit_issue(issue_id, *, is_test=False):
    client = SendPulse()
    sync_subscribers(client)
    with delivery_lock():
        issue = NewsletterIssue.objects.using('default').select_for_update().get(pk=issue_id)
        if issue.status not in ('draft', 'failed') or issue.provider_campaign_id:
            raise NewsletterError('This issue is already submitted. Sync to check its delivery status.', status=409)
        if issue.send_attempts.db_manager('default').filter(status__in=['creating', 'unknown']).exists():
            raise NewsletterError('A previous request has an uncertain outcome. Sync and check SendPulse before sending again.', status=409)
        if not strip_tags(issue.body_html).strip() and '<img' not in issue.body_html:
            raise NewsletterError('Write the issue body before sending.')
        limits = account_status(client)
        count = _free_quote(client, limits, is_test)
        attempt = NewsletterSendAttempt.objects.using('default').create(issue=issue, is_test=is_test, reserved_count=count)
        if not is_test:
            issue.status, issue.last_error, issue.recipient_count = 'queued', '', count
            issue.save(update_fields=['status', 'last_error', 'recipient_count'])
    # The local identity is committed BEFORE the request. An interrupted process
    # is reconciled by campaign name, never by blind re-creation.
    try:
        result = client.create_campaign(issue, attempt, email_html(issue.body_html))
        if not isinstance(result, dict) or not result.get('id'):
            raise NewsletterError('SendPulse did not return a campaign ID. Sync to check delivery.', uncertain=True, status=503)
        try:
            campaign_id = _number(result['id'])
            if not campaign_id:
                raise ValueError
        except (NewsletterError, ValueError):
            raise NewsletterError('SendPulse returned an invalid campaign ID. Sync to check delivery.', uncertain=True, status=503) from None
    except NewsletterError as exc:
        with delivery_lock():
            attempt.status = 'unknown' if exc.uncertain else 'failed'
            attempt.last_error = str(exc)
            attempt.save(update_fields=['status', 'last_error'])
            if not is_test:
                issue.status = 'review' if exc.uncertain else 'failed'
                issue.last_error = str(exc)
                issue.save(update_fields=['status', 'last_error'])
        raise
    with delivery_lock():
        attempt.provider_campaign_id, attempt.status = str(campaign_id), 'accepted'
        attempt.save(update_fields=['provider_campaign_id', 'status'])
        if not is_test:
            issue.provider_campaign_id = attempt.provider_campaign_id
            issue.save(update_fields=['provider_campaign_id'])
    return issue


def sync_campaigns(client):
    attempts = NewsletterSendAttempt.objects.using('default').filter(status__in=['creating', 'unknown'])
    recover = list(attempts.filter(created_at__lt=timezone.now() - timedelta(minutes=2)))
    campaigns = client.campaigns() if recover else []
    for attempt in recover:
        match = next((c for c in campaigns if c.get('task_name') == attempt.campaign_name), None)
        if match and match.get('task_id'):
            with delivery_lock():
                attempt.refresh_from_db(using='default')
                if attempt.status not in ('creating', 'unknown'):
                    continue
                attempt.status, attempt.provider_campaign_id, attempt.last_error = 'accepted', str(match['task_id']), ''
                attempt.save(update_fields=['status', 'provider_campaign_id', 'last_error'])
                if not attempt.is_test:
                    NewsletterIssue.objects.using('default').filter(pk=attempt.issue_id).update(
                        provider_campaign_id=attempt.provider_campaign_id, status='queued', last_error='',
                    )
        else:
            with delivery_lock():
                attempt.refresh_from_db(using='default')
                if attempt.status not in ('creating', 'unknown'):
                    continue
                attempt.status = 'unknown'
                attempt.save(update_fields=['status'])
                if not attempt.is_test:
                    NewsletterIssue.objects.using('default').filter(pk=attempt.issue_id).update(
                        status='review', last_error='No matching campaign found yet. Check SendPulse before creating another issue; this request will not be automatically resent.',
                    )
    pending_issues = NewsletterIssue.objects.using('default').exclude(provider_campaign_id='').filter(status__in=['queued', 'moderation', 'sending', 'review']).order_by('created_at')[:5]
    recent_sent = NewsletterIssue.objects.using('default').exclude(provider_campaign_id='').filter(status='sent').order_by('-sent_at')[:2]
    for issue in [*pending_issues, *recent_sent]:
        result = client.campaign(issue.provider_campaign_id)
        if not isinstance(result, dict) or 'status' not in result:
            raise NewsletterError('Could not read the campaign’s delivery status.', status=503)
        code = _number(result['status'])
        issue.status = {0: 'queued', 1: 'moderation', 2: 'sending', 3: 'sent', 4: 'sent', 5: 'failed', 26: 'review'}.get(code, 'queued')
        if code == 5:
            issue.last_error = 'SendPulse blocked this campaign. Check account approval and the campaign in its dashboard.'
        if code in (3, 4):
            issue.sent_at = issue.sent_at or timezone.now()
            issue.recipient_count = _number(result.get('all_email_qty', issue.recipient_count))
        statistics = result.get('statistics') or {}
        if not isinstance(statistics, dict):
            raise NewsletterError('Could not read SendPulse campaign statistics.', status=503)
        general = statistics.get('general') or []
        counts = {r.get('code'): _number(r.get('count', 0)) for r in general if isinstance(r, dict)}
        issue.delivered_count, issue.opened_count, issue.clicked_count = counts.get(2, 0), counts.get(3, 0), counts.get(4, 0)
        issue.bounced_count = sum(counts.get(n, 0) for n in (6, 8, 9, 12, 14, 16))
        issue.save(update_fields=['status', 'last_error', 'sent_at', 'recipient_count', 'delivered_count', 'opened_count', 'clicked_count', 'bounced_count'])


def synchronize(deadline_s=40):
    client = SendPulse(deadline_s=deadline_s)
    sync_subscribers(client)
    welcome_confirmed_subscribers(client)
    sync_campaigns(client)


def unsubscribe_token(email: str) -> str:
    sig = hmac.new(
        settings.DOWNLOAD_SECRET.encode(), email.encode(), hashlib.sha256
    ).hexdigest()
    raw = f'{email}:{sig}'
    return base64.urlsafe_b64encode(raw.encode()).rstrip(b'=').decode()


def verify_unsubscribe_token(token: str) -> str | None:
    try:
        padded = token + '=' * (-len(token) % 4)
        decoded = base64.urlsafe_b64decode(padded).decode()
        email, _, sig = decoded.rpartition(':')
        if not email or not sig:
            return None
        expected = hmac.new(
            settings.DOWNLOAD_SECRET.encode(), email.encode(), hashlib.sha256
        ).hexdigest()
        return email if hmac.compare_digest(sig, expected) else None
    except Exception:
        return None


def unsubscribe_url(email: str) -> str:
    base = settings.SITE_URL.rstrip('/')
    return f'{base}/api/newsletter/unsubscribe?token={unsubscribe_token(email)}'

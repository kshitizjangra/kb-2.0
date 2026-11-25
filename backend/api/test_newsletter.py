from datetime import timedelta
from unittest.mock import Mock, patch

import requests
from django.core.cache import cache
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from . import newsletter
from .models import Email, NewsletterIssue, NewsletterSendAttempt, Subscriber
from .sendpulse import NewsletterError, SendPulse
from .rate_limit import clear_failures


PROVIDER_SETTINGS = {
    'SENDPULSE_CLIENT_ID': 'fake-id', 'SENDPULSE_CLIENT_SECRET': 'fake-secret',
    'SENDPULSE_LIST_ID': '123', 'SENDPULSE_SENDER_EMAIL': 'kamna@example.com',
    'SENDPULSE_SENDER_NAME': 'Kamna',
}


@override_settings(**PROVIDER_SETTINGS)
class NewsletterTests(TestCase):
    def setUp(self):
        cache.clear()
        clear_failures('newsletter', '127.0.0.1')
        patcher = patch('api.newsletter.SendPulse')
        self.provider = patcher.start().return_value
        self.addCleanup(patcher.stop)
        self.provider.balance.return_value = {'email': {
            'current_subscribers': 1, 'maximum_subscribers': 500, 'emails_left': 15000,
        }, 'smtp': {'tariff_name': 'SMTP Free', 'email_qty': 12000, 'email_qty_left': 12000, 'qty_per_hour': 50}}
        self.provider.senders.return_value = [{'email': 'kamna@example.com', 'status': 'Active', 'is_allowed_for_smtp': True}]
        self.provider.welcome.return_value = 'welcome-42'
        self.provider.cost.return_value = {
            'result': True, 'overdraftAllEmailsPrice': 0,
            'addressesDeltaFromBalance': 0, 'sent_emails_qty': 1,
        }
        self.provider.contacts.return_value = [{'email': 'reader@example.com', 'status': 1}]
        self.provider.create_campaign.return_value = {'id': 42, 'status': 13}
        self.provider.subscribe.return_value = {'result': True}
        self.provider.campaigns.return_value = []
        self.provider.campaign.return_value = {'id': 42, 'status': 3, 'all_email_qty': 1}
        self.issue = NewsletterIssue.objects.create(subject='Har week, one honest lesson', body_html='<p>Start with your own story.</p>')
        self.subscriber = Subscriber.objects.create(email='reader@example.com', consent_at=timezone.now())

    def login(self):
        session = self.client.session
        session['admin'] = True
        session.save()

    def post_signup(self, **changes):
        body = {'email': ' NEW@Example.com ', 'name': 'Reader', 'consent': True}
        body.update(changes)
        return self.client.post('/api/newsletter/subscribe', body, content_type='application/json')

    def test_signup_normalizes_email_and_requires_confirmation(self):
        result = self.post_signup(source='pdf')
        self.assertEqual(result.status_code, 202)
        row = Subscriber.objects.get(email='new@example.com')
        self.assertFalse(row.is_active)
        self.assertEqual(row.status, 'pending')
        self.assertEqual(row.source, 'pdf')
        self.assertIsNotNone(row.consent_at)
        self.provider.subscribe.assert_called_once_with('new@example.com', 'Reader')

    def test_duplicate_pending_signup_does_not_send_another_confirmation(self):
        self.post_signup()
        self.post_signup(email='new@example.com')
        self.provider.subscribe.assert_called_once()
        self.assertEqual(Subscriber.objects.filter(email='new@example.com').count(), 1)

    def test_unsubscribe_is_not_undone_by_repeated_signup(self):
        self.subscriber.status = 'unsubscribed'
        self.subscriber.save()
        self.post_signup(email=self.subscriber.email)
        self.provider.subscribe.assert_not_called()
        self.subscriber.refresh_from_db()
        self.assertEqual(self.subscriber.status, 'unsubscribed')

    def test_consent_and_email_validation(self):
        for changes in ({'consent': False}, {'consent': 'yes'}, {'email': 'bad'}, {'name': 'a' * 121}):
            with self.subTest(changes=changes):
                self.assertEqual(self.post_signup(**changes).status_code, 422)
        self.provider.subscribe.assert_not_called()

    def test_non_object_payload_and_honeypot(self):
        self.assertEqual(self.client.post('/api/newsletter/subscribe', '[1]', content_type='application/json').status_code, 400)
        self.assertEqual(self.post_signup(website='spam.example').status_code, 202)
        self.provider.subscribe.assert_not_called()

    def test_full_free_account_rejects_signup(self):
        self.provider.balance.return_value['email']['current_subscribers'] = 500
        self.assertEqual(self.post_signup().status_code, 422)
        self.provider.subscribe.assert_not_called()

    def test_pdf_download_emails_are_never_imported_as_subscribers(self):
        Email.objects.create(email='pdf-only@example.com')
        self.provider.contacts.return_value += [{'email': 'pdf-only@example.com', 'status': 1}]
        newsletter.sync_subscribers(self.provider)
        self.assertFalse(Subscriber.objects.filter(email='pdf-only@example.com').exists())

    def test_only_confirmed_provider_status_can_activate_opted_in_reader(self):
        newsletter.sync_subscribers(self.provider)
        self.subscriber.refresh_from_db()
        self.assertTrue(self.subscriber.is_active)
        self.assertIsNotNone(self.subscriber.confirmed_at)
        self.provider.contacts.return_value[0]['status'] = 2
        newsletter.sync_subscribers(self.provider)
        self.subscriber.refresh_from_db()
        self.assertFalse(self.subscriber.is_active)

    def test_legacy_row_without_consent_cannot_be_activated(self):
        self.subscriber.consent_at = None
        self.subscriber.save()
        newsletter.sync_subscribers(self.provider)
        self.subscriber.refresh_from_db()
        self.assertFalse(self.subscriber.is_active)

    def test_provider_opt_out_and_bounce_are_reflected_locally(self):
        for code, expected in [(4, 'unsubscribed'), (9, 'suppressed')]:
            self.subscriber.status = 'active'
            self.subscriber.save()
            self.provider.contacts.return_value[0]['status'] = code
            newsletter.sync_subscribers(self.provider)
            self.subscriber.refresh_from_db()
            self.assertEqual(self.subscriber.status, expected)
            self.assertFalse(self.subscriber.is_active)

    def test_paid_quote_is_blocked_before_create(self):
        for field, value in [('overdraftAllEmailsPrice', '0.01'), ('addressesDeltaFromBalance', 1), ('overdraftAllEmailsPrice', 'NaN')]:
            with self.subTest(field=field):
                quote = dict(result=True, overdraftAllEmailsPrice=0, addressesDeltaFromBalance=0, sent_emails_qty=1)
                quote[field] = value
                self.provider.cost.return_value = quote
                with self.assertRaises(NewsletterError):
                    newsletter.submit_issue(self.issue.id)
        self.provider.create_campaign.assert_not_called()

    def test_monthly_quota_and_paid_plan_are_blocked(self):
        for field, value in [('emails_left', 0), ('maximum_subscribers', 1000), ('emails_left', None)]:
            with self.subTest(field=field):
                self.provider.balance.return_value['email'] = {
                    'current_subscribers': 1, 'maximum_subscribers': 500, 'emails_left': 15000,
                }
                self.provider.balance.return_value['email'][field] = value
                with self.assertRaises(NewsletterError):
                    newsletter.submit_issue(self.issue.id)
        self.provider.create_campaign.assert_not_called()

    def test_hourly_limit_includes_tests(self):
        for _ in range(4):
            NewsletterSendAttempt.objects.create(issue=self.issue, is_test=True, status='accepted', reserved_count=1)
        with self.assertRaisesMessage(NewsletterError, 'four campaigns per hour'):
            newsletter.submit_issue(self.issue.id)
        self.provider.create_campaign.assert_not_called()

    def test_dispatch_audit_reads_stay_on_locked_write_connection(self):
        class AuditReadRouter:
            def db_for_read(self, model, **hints):
                return 'unavailable_readonly' if model is NewsletterSendAttempt else None
        with override_settings(DATABASE_ROUTERS=[AuditReadRouter()]):
            result = newsletter.submit_issue(self.issue.id)
        self.assertEqual(result.status, 'queued')

    def test_campaign_is_queued_not_falsely_reported_sent(self):
        self.login()
        result = self.client.post(f'/api/admin/newsletter/issues/{self.issue.id}/send')
        self.assertEqual(result.status_code, 202)
        self.assertEqual(result.json()['issue']['status'], 'queued')
        self.assertIsNone(result.json()['issue']['sentAt'])
        self.assertEqual(result.json()['issue']['providerCampaignId'], '42')
        repeat = self.client.post(f'/api/admin/newsletter/issues/{self.issue.id}/send')
        self.assertEqual(repeat.status_code, 409)
        self.provider.create_campaign.assert_called_once()

    def test_empty_body_never_sends(self):
        self.issue.body_html = '<p><br></p>'
        self.issue.save()
        with self.assertRaisesMessage(NewsletterError, 'Write the issue body'):
            newsletter.submit_issue(self.issue.id)
        self.provider.create_campaign.assert_not_called()

    def test_uncertain_submission_is_not_retried(self):
        self.provider.create_campaign.side_effect = NewsletterError('Timed out', uncertain=True, status=503)
        with self.assertRaises(NewsletterError):
            newsletter.submit_issue(self.issue.id)
        self.issue.refresh_from_db()
        self.assertEqual(self.issue.status, 'review')
        self.assertEqual(NewsletterSendAttempt.objects.get().status, 'unknown')
        with self.assertRaises(NewsletterError):
            newsletter.submit_issue(self.issue.id)
        self.provider.create_campaign.assert_called_once()

    def test_interrupted_request_recovers_by_durable_campaign_name(self):
        attempt = NewsletterSendAttempt.objects.create(issue=self.issue, status='unknown', reserved_count=1)
        NewsletterSendAttempt.objects.filter(pk=attempt.pk).update(created_at=timezone.now() - timedelta(minutes=3))
        self.provider.campaigns.return_value = [
            {'task_id': 99, 'task_name': 'unrelated'},
            {'task_id': 42, 'task_name': attempt.campaign_name},
        ]
        newsletter.sync_campaigns(self.provider)
        self.issue.refresh_from_db()
        self.assertEqual(self.issue.provider_campaign_id, '42')
        self.assertEqual(self.issue.status, 'sent')
        self.provider.create_campaign.assert_not_called()

    def test_interruption_while_saving_provider_id_keeps_recoverable_attempt(self):
        original_save = NewsletterIssue.save
        def interrupted_save(issue, *args, **kwargs):
            if kwargs.get('update_fields') == ['provider_campaign_id']:
                raise RuntimeError('Simulated process interruption')
            return original_save(issue, *args, **kwargs)
        with patch.object(NewsletterIssue, 'save', new=interrupted_save):
            with self.assertRaises(RuntimeError):
                newsletter.submit_issue(self.issue.id)
        attempt = NewsletterSendAttempt.objects.get()
        self.assertEqual(attempt.status, 'creating')
        self.assertEqual(attempt.provider_campaign_id, '')
        NewsletterSendAttempt.objects.filter(pk=attempt.pk).update(created_at=timezone.now() - timedelta(minutes=3))
        self.provider.campaigns.return_value = [{'task_id': 42, 'task_name': attempt.campaign_name}]
        newsletter.sync_campaigns(self.provider)
        self.issue.refresh_from_db()
        self.assertEqual(self.issue.status, 'sent')
        self.assertEqual(self.issue.provider_campaign_id, '42')
        self.provider.create_campaign.assert_called_once()

    def test_missing_reconciliation_does_not_auto_resend(self):
        attempt = NewsletterSendAttempt.objects.create(issue=self.issue, status='creating', reserved_count=1)
        NewsletterSendAttempt.objects.filter(pk=attempt.pk).update(created_at=timezone.now() - timedelta(minutes=3))
        newsletter.sync_campaigns(self.provider)
        self.issue.refresh_from_db()
        self.assertEqual(self.issue.status, 'review')
        self.provider.create_campaign.assert_not_called()

    def test_moderation_and_actual_delivery_status(self):
        self.issue.provider_campaign_id = '42'
        self.issue.status = 'queued'
        self.issue.save()
        self.provider.campaign.return_value = {'status': 1}
        newsletter.sync_campaigns(self.provider)
        self.issue.refresh_from_db()
        self.assertEqual(self.issue.status, 'moderation')
        self.assertIsNone(self.issue.sent_at)
        self.provider.campaign.return_value = {'status': 3, 'all_email_qty': 1, 'statistics': {'general': [{'code': 2, 'count': 1}]}}
        newsletter.sync_campaigns(self.provider)
        self.issue.refresh_from_db()
        self.assertEqual(self.issue.status, 'sent')
        self.assertEqual(self.issue.delivered_count, 1)

    def test_test_send_uses_verified_sender_and_keeps_draft(self):
        self.login()
        result = self.client.post(f'/api/admin/newsletter/issues/{self.issue.id}/test', {'email': 'arbitrary@example.com'}, content_type='application/json')
        self.assertEqual(result.status_code, 202)
        self.assertEqual(result.json()['email'], 'kamna@example.com')
        self.issue.refresh_from_db()
        self.assertEqual(self.issue.status, 'draft')
        self.assertTrue(self.provider.create_campaign.call_args.args[1].is_test)

    def test_unknown_test_request_also_blocks_production_send(self):
        self.provider.create_campaign.side_effect = NewsletterError('Timed out', uncertain=True)
        with self.assertRaises(NewsletterError):
            newsletter.submit_issue(self.issue.id, is_test=True)
        with self.assertRaises(NewsletterError):
            newsletter.submit_issue(self.issue.id)
        self.provider.create_campaign.assert_called_once()

    def test_email_scanner_get_does_not_unsubscribe(self):
        self.subscriber.is_active, self.subscriber.status = True, 'active'
        self.subscriber.save()
        token = newsletter.unsubscribe_token(self.subscriber.email)
        result = self.client.get('/api/newsletter/unsubscribe', {'token': token})
        self.assertContains(result, 'method="post"')
        self.subscriber.refresh_from_db()
        self.assertTrue(self.subscriber.is_active)
        self.provider.unsubscribe.assert_not_called()

    def test_explicit_opt_out_remains_inactive_during_provider_outage(self):
        self.provider.unsubscribe.side_effect = NewsletterError('Offline', status=503)
        token = newsletter.unsubscribe_token(self.subscriber.email)
        self.assertEqual(self.client.post('/api/newsletter/unsubscribe', {'token': token}).status_code, 200)
        self.subscriber.refresh_from_db()
        self.assertTrue(self.subscriber.unsubscribe_pending)
        self.assertEqual(self.subscriber.status, 'unsubscribed')
        self.provider.unsubscribe.side_effect = None
        newsletter.sync_subscribers(self.provider)
        self.subscriber.refresh_from_db()
        self.assertFalse(self.subscriber.is_active)
        self.assertFalse(self.subscriber.unsubscribe_pending)

    def test_admin_authentication_for_every_newsletter_operation(self):
        paths = [
            ('get', 'status'), ('get', 'subscribers'), ('get', 'issues'),
            ('get', f'issues/{self.issue.id}'), ('post', 'sync'),
            ('post', 'issues/create'), ('patch', f'issues/{self.issue.id}/edit'),
            ('delete', f'issues/{self.issue.id}/delete'),
            ('post', f'issues/{self.issue.id}/send'), ('post', f'issues/{self.issue.id}/test'),
            ('delete', f'subscribers/{self.subscriber.id}'),
        ]
        for method, path in paths:
            with self.subTest(path=path):
                self.assertEqual(getattr(self.client, method)(f'/api/admin/newsletter/{path}').status_code, 401)

    def test_submitted_issue_cannot_be_edited_or_deleted(self):
        newsletter.submit_issue(self.issue.id)
        self.login()
        update = self.client.patch(f'/api/admin/newsletter/issues/{self.issue.id}/edit', {'subject': 'Changed'}, content_type='application/json')
        delete = self.client.delete(f'/api/admin/newsletter/issues/{self.issue.id}/delete')
        self.assertEqual(update.status_code, 422)
        self.assertEqual(delete.status_code, 409)

    def test_deleting_tested_draft_preserves_quota_history(self):
        newsletter.submit_issue(self.issue.id, is_test=True)
        self.login()
        self.assertEqual(self.client.delete(f'/api/admin/newsletter/issues/{self.issue.id}/delete').status_code, 200)
        self.assertEqual(NewsletterSendAttempt.objects.count(), 1)
        self.assertIsNone(NewsletterSendAttempt.objects.get().issue_id)

    def test_preview_is_sanitized_and_uses_provider_unsubscribe(self):
        self.login()
        result = self.client.post('/api/admin/newsletter/issues/create', {
            'subject': 'Hello', 'body_html': '<p onclick="bad()">Good</p><script>bad()</script>',
        }, content_type='application/json')
        self.assertEqual(result.status_code, 201)
        data = result.json()['issue']
        self.assertNotIn('<script>', data['previewHtml'])
        self.assertNotIn('onclick', data['previewHtml'])
        self.assertIn('{{unsubscribe_url}}', newsletter.email_html(data['bodyHtml']))

    def test_csrf_required_on_signup(self):
        client = Client(enforce_csrf_checks=True)
        result = client.post('/api/newsletter/subscribe', {'email': 'new@example.com', 'consent': True}, content_type='application/json')
        self.assertEqual(result.status_code, 403)

    @override_settings(DEBUG=True)
    def test_welcome_is_queued_once_after_confirmation(self):
        newsletter.welcome_confirmed_subscribers(self.provider)
        self.provider.welcome.assert_not_called()
        newsletter.sync_subscribers(self.provider)
        newsletter.welcome_confirmed_subscribers(self.provider)
        newsletter.welcome_confirmed_subscribers(self.provider)
        self.provider.welcome.assert_called_once()
        self.subscriber.refresh_from_db()
        self.assertEqual(self.subscriber.welcome_status, 'queued')
        self.assertEqual(self.subscriber.welcome_provider_id, 'welcome-42')

    @override_settings(DEBUG=True)
    def test_welcome_never_uses_paid_smtp_plan(self):
        newsletter.sync_subscribers(self.provider)
        self.provider.balance.return_value['smtp']['tariff_name'] = 'SMTP Paid'
        newsletter.welcome_confirmed_subscribers(self.provider)
        self.provider.welcome.assert_not_called()

    @override_settings(DEBUG=True)
    def test_uncertain_welcome_is_not_replayed(self):
        newsletter.sync_subscribers(self.provider)
        self.provider.welcome.side_effect = NewsletterError('Timeout', uncertain=True)
        newsletter.welcome_confirmed_subscribers(self.provider)
        newsletter.welcome_confirmed_subscribers(self.provider)
        self.provider.welcome.assert_called_once()
        self.subscriber.refresh_from_db()
        self.assertEqual(self.subscriber.welcome_status, 'review')

    @override_settings(DEBUG=True)
    def test_welcome_personalization_escapes_name_and_links_to_list_opt_out(self):
        self.subscriber.name = '<img src=x onerror=bad()>'
        self.subscriber.save()
        newsletter.sync_subscribers(self.provider)
        newsletter.welcome_confirmed_subscribers(self.provider)
        html = self.provider.welcome.call_args.args[1]
        self.assertIn('&lt;img', html)
        self.assertNotIn('<img src=x', html)
        self.assertIn('/api/newsletter/unsubscribe?token=', html)
        self.assertNotIn('{{unsubscribe_url}}', html)

    @override_settings(DEBUG=True)
    def test_empty_welcome_quota_and_inactive_contacts_do_not_send(self):
        newsletter.sync_subscribers(self.provider)
        self.provider.balance.return_value['smtp']['email_qty_left'] = 0
        newsletter.welcome_confirmed_subscribers(self.provider)
        self.provider.welcome.assert_not_called()

    @override_settings(DEBUG=False, SITE_URL='http://localhost:8765')
    def test_live_welcome_requires_public_https_unsubscribe_url(self):
        newsletter.sync_subscribers(self.provider)
        newsletter.welcome_confirmed_subscribers(self.provider)
        self.provider.welcome.assert_not_called()


class UnconfiguredNewsletterTests(TestCase):
    def setUp(self):
        cache.clear()
        clear_failures('newsletter', '127.0.0.1')

    def test_missing_credentials_return_honest_unavailable_not_fake_success(self):
        result = self.client.post('/api/newsletter/subscribe', {'email': 'new@example.com', 'consent': True}, content_type='application/json')
        self.assertEqual(result.status_code, 503)
        self.assertEqual(Subscriber.objects.count(), 0)

    def test_admin_can_see_setup_requirements_without_exposing_secrets(self):
        session = self.client.session
        session['admin'] = True
        session.save()
        result = self.client.get('/api/admin/newsletter/status')
        self.assertEqual(result.status_code, 200)
        self.assertFalse(result.json()['ready'])


@override_settings(**PROVIDER_SETTINGS)
class SendPulseClientTests(TestCase):
    def setUp(self):
        cache.clear()
        cache.set(SendPulse().token_key, 'fake-token', 60)

    @patch('api.sendpulse.requests.request')
    def test_double_opt_in_payload(self, request):
        request.return_value = Mock(ok=True, status_code=200)
        request.return_value.json.return_value = {'result': True}
        SendPulse().subscribe('reader@example.com', 'Reader')
        payload = request.call_args.kwargs['json']
        self.assertEqual(payload['confirmation'], 'force')
        self.assertEqual(payload['sender_email'], 'kamna@example.com')
        self.assertEqual(payload['message_lang'], 'en')

    @patch('api.sendpulse.requests.request')
    def test_timeout_does_not_automatically_retry_campaign(self, request):
        request.side_effect = requests.Timeout()
        with self.assertRaises(NewsletterError) as caught:
            SendPulse().request('POST', '/campaigns', payload={'name': 'unique'})
        self.assertTrue(caught.exception.uncertain)
        request.assert_called_once()

    @patch('api.sendpulse.requests.request')
    def test_invalid_success_response_is_uncertain(self, request):
        request.return_value = Mock(ok=True, status_code=200)
        request.return_value.json.side_effect = ValueError()
        with self.assertRaises(NewsletterError) as caught:
            SendPulse().request('POST', '/campaigns')
        self.assertTrue(caught.exception.uncertain)

    @patch('api.sendpulse.requests.request')
    def test_unconfirmed_opt_out_response_is_not_treated_as_success(self, request):
        request.return_value = Mock(ok=True, status_code=200)
        request.return_value.json.return_value = {}
        with self.assertRaises(NewsletterError):
            SendPulse().unsubscribe('reader@example.com')

    @patch('api.sendpulse.requests.request')
    def test_contact_pagination(self, request):
        response1 = Mock(ok=True, status_code=200)
        response1.json.return_value = [{'email': f'{n}@example.com', 'status': 1} for n in range(100)]
        response2 = Mock(ok=True, status_code=200)
        response2.json.return_value = [{'email': 'last@example.com', 'status': 2}]
        request.side_effect = [response1, response2]
        self.assertEqual(len(SendPulse().contacts()), 101)
        self.assertEqual(request.call_args.kwargs['params']['offset'], 100)

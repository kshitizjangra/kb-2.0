"""Small SendPulse REST client. Never automatically retry a mutating request."""
import base64
import hashlib
import time

import requests
from django.conf import settings
from django.core.cache import cache


class NewsletterError(Exception):
    def __init__(self, message, *, uncertain=False, status=422):
        super().__init__(message)
        self.uncertain = uncertain
        self.status = status


def configured():
    return all(getattr(settings, key, '') for key in (
        'SENDPULSE_CLIENT_ID', 'SENDPULSE_CLIENT_SECRET',
        'SENDPULSE_LIST_ID', 'SENDPULSE_SENDER_EMAIL',
    ))


class SendPulse:
    BASE = 'https://api.sendpulse.com'

    def __init__(self, deadline_s=40):
        if not configured():
            raise NewsletterError('SendPulse setup is incomplete. Add the backend settings listed in the setup guide.', status=503)
        identity = f'{settings.SENDPULSE_CLIENT_ID}:{settings.SENDPULSE_CLIENT_SECRET}'
        self.token_key = 'newsletter:oauth:' + hashlib.sha256(identity.encode()).hexdigest()
        self.list_id = str(settings.SENDPULSE_LIST_ID)
        if not self.list_id.isdigit():
            raise NewsletterError('SENDPULSE_LIST_ID must be the numeric mailing-list ID.', status=503)
        self.deadline = time.monotonic() + deadline_s

    def _timeout(self):
        remaining = self.deadline - time.monotonic()
        if remaining < 1:
            raise NewsletterError('Newsletter sync reached its time budget. Sync again to continue safely.', status=503)
        return min(5, remaining / 2), min(15, remaining / 2)

    def _token(self):
        token = cache.get(self.token_key)
        if token:
            return token
        try:
            response = requests.post(
                f'{self.BASE}/oauth/access_token',
                json={'grant_type': 'client_credentials', 'client_id': settings.SENDPULSE_CLIENT_ID,
                      'client_secret': settings.SENDPULSE_CLIENT_SECRET},
                timeout=self._timeout(), allow_redirects=False,
            )
            data = response.json()
            if not response.ok or not isinstance(data, dict) or not data.get('access_token'):
                raise NewsletterError('SendPulse authentication failed. Check the API ID and secret.', status=503)
            token = data['access_token']
            cache.set(self.token_key, token, max(1, int(data.get('expires_in', 3600)) - 60))
            return token
        except (requests.RequestException, ValueError, TypeError):
            raise NewsletterError('Could not connect to SendPulse. Please retry shortly.', status=503) from None

    def request(self, method, path, *, payload=None, params=None):
        try:
            response = requests.request(
                method, f'{self.BASE}{path}', json=payload, params=params,
                headers={'Authorization': f'Bearer {self._token()}', 'Accept': 'application/json'},
                timeout=self._timeout(), allow_redirects=False,
            )
        except requests.RequestException:
            raise NewsletterError(
                'SendPulse did not confirm this request. Check its status before retrying.',
                uncertain=method != 'GET', status=503,
            ) from None
        if response.status_code == 401:
            cache.delete(self.token_key)
            raise NewsletterError('SendPulse authentication expired. Please retry.', status=503)
        if not response.ok or not 200 <= response.status_code < 300:
            message = ('SendPulse rate limit reached. Please wait and retry.' if response.status_code == 429
                       else 'SendPulse rejected this request. Check sender verification, account approval and free-plan limits.')
            raise NewsletterError(message, uncertain=method != 'GET' and (response.status_code >= 500 or 300 <= response.status_code < 400), status=503)
        try:
            data = response.json()
        except ValueError:
            raise NewsletterError('SendPulse returned an unreadable response. Check its status before retrying.',
                                  uncertain=method != 'GET', status=503) from None
        if isinstance(data, dict) and (data.get('result') is False or data.get('is_error') is True):
            raise NewsletterError('SendPulse could not complete this request. Check the account dashboard.', status=503)
        return data

    def balance(self):
        return self.request('GET', '/user/balance/detail')

    def senders(self):
        return self.request('GET', '/senders')

    def cost(self):
        return self.request('GET', f'/addressbooks/{self.list_id}/cost')

    def contacts(self):
        rows = []
        for offset in range(0, 10000, 100):
            page = self.request('GET', f'/addressbooks/{self.list_id}/emails', params={'limit': 100, 'offset': offset})
            if not isinstance(page, list):
                raise NewsletterError('SendPulse returned an unexpected subscriber list.', status=503)
            rows.extend(page)
            if len(page) < 100:
                return rows
        raise NewsletterError('Mailing list exceeds the supported free-plan size.')

    def subscribe(self, email, name):
        result = self.request('POST', f'/addressbooks/{self.list_id}/emails', payload={
            'emails': [{'email': email, 'variables': {'name': name}}],
            'confirmation': 'force', 'sender_email': settings.SENDPULSE_SENDER_EMAIL, 'message_lang': 'en',
        })
        if not isinstance(result, dict) or result.get('result') is not True:
            raise NewsletterError('SendPulse did not confirm the subscription request.', uncertain=True, status=503)
        return result

    def unsubscribe(self, email):
        result = self.request('POST', f'/addressbooks/{self.list_id}/emails/unsubscribe', payload={'emails': [email]})
        if not isinstance(result, dict) or result.get('result') is not True:
            raise NewsletterError('SendPulse did not confirm the opt-out. Local suppression is retained for retry.', uncertain=True, status=503)
        return result

    def campaigns(self):
        rows = []
        for offset in range(0, 1000, 100):
            page = self.request('GET', f'/addressbooks/{self.list_id}/campaigns', params={'limit': 100, 'offset': offset})
            if not isinstance(page, list):
                raise NewsletterError('SendPulse returned an unexpected campaign list.', status=503)
            rows.extend(page)
            if len(page) < 100:
                break
        return rows

    def campaign(self, campaign_id):
        return self.request('GET', f'/campaigns/{campaign_id}')

    def create_campaign(self, issue, attempt, html):
        return self.request('POST', '/campaigns', payload={
            'sender_name': settings.SENDPULSE_SENDER_NAME,
            'sender_email': settings.SENDPULSE_SENDER_EMAIL,
            'subject': issue.subject, 'body': base64.b64encode(html.encode()).decode(),
            'list_id': int(self.list_id), 'name': attempt.campaign_name,
            'is_test': attempt.is_test,
        })

    def welcome(self, subscriber, html):
        result = self.request('POST', '/smtp/emails', payload={'email': {
            'html': base64.b64encode(html.encode()).decode(), 'auto_plain_text': True,
            'subject': 'You’re on the list! A little note from Kamna',
            'from': {'name': settings.SENDPULSE_SENDER_NAME, 'email': settings.SENDPULSE_SENDER_EMAIL},
            'to': [{'name': subscriber.name, 'email': subscriber.email}],
        }})
        if not isinstance(result, dict) or result.get('result') is not True or not isinstance(result.get('id'), str) or not result['id']:
            raise NewsletterError('SendPulse did not confirm the welcome email. Check its SMTP dashboard before retrying.', uncertain=True, status=503)
        return result['id']

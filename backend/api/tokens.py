"""HMAC download tokens — parity with frontend src/lib/downloadToken.ts.

Format: base64url(email:expiry_ms:hex_hmac), TTL 10 minutes.
"""
import base64
import hashlib
import hmac
import time

from django.conf import settings

TTL_MS = 10 * 60 * 1000


def _secret() -> bytes:
    return settings.DOWNLOAD_SECRET.encode()


def create_download_token(email: str) -> str:
    exp = int(time.time() * 1000) + TTL_MS
    payload = f'{email}:{exp}'
    sig = hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()
    raw = f'{payload}:{sig}'
    return base64.urlsafe_b64encode(raw.encode()).rstrip(b'=').decode()


def verify_download_token(token: str) -> bool:
    try:
        padded = token + '=' * (-len(token) % 4)
        decoded = base64.urlsafe_b64decode(padded).decode()
        last_colon = decoded.rfind(':')
        second_last = decoded.rfind(':', 0, last_colon)
        if last_colon < 0 or second_last < 0:
            return False
        payload = decoded[:last_colon]
        sig = decoded[last_colon + 1:]
        exp = int(decoded[second_last + 1:last_colon])
        if int(time.time() * 1000) > exp:
            return False
        expected = hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, expected)
    except Exception:
        return False

"""In-memory per-IP rate limiter — parity with Next.js route handlers.

Note: store is per-process. On serverless it resets on cold start and is
not shared between instances — best-effort protection, not a hard guarantee.
"""
import time
from django.http import HttpRequest, JsonResponse

_store: dict[str, dict[str, int]] = {}

# Bound the store so unbounded key growth cannot exhaust memory.
_MAX_STORE_KEYS = 10_000


def client_ip(request: HttpRequest) -> str:
    """Best-effort real client IP, resistant to header spoofing.

    Order of trust:
    1. CF-Connecting-IP — set by Cloudflare edge, not spoofable through it.
    2. Rightmost X-Forwarded-For hop — the entry appended by the nearest
       trusted proxy (Vercel/ALB overwrite or append); leftmost entries
       are client-controlled and must never be trusted.
    3. REMOTE_ADDR — TCP peer.
    """
    cf = request.META.get('HTTP_CF_CONNECTING_IP')
    if cf:
        return cf.strip()
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[-1].strip()
    return request.META.get('REMOTE_ADDR') or 'unknown'


def _sweep(now: int) -> None:
    """Drop expired entries when the store grows past the cap."""
    if len(_store) < _MAX_STORE_KEYS:
        return
    expired = [k for k, e in _store.items() if now > e['resetAt']]
    for k in expired:
        del _store[k]
    if len(_store) >= _MAX_STORE_KEYS:
        # Still full (all live) — drop oldest-reset entries to stay bounded.
        for k in sorted(_store, key=lambda k: _store[k]['resetAt'])[
            : len(_store) - _MAX_STORE_KEYS + 1
        ]:
            del _store[k]


def check_limit(
    key: str, ip: str, max_attempts: int, window_ms: int
) -> tuple[bool, int, int]:
    """Returns (allowed, remaining, reset_at_epoch_ms)."""
    now = int(time.time() * 1000)
    _sweep(now)
    store_key = f'{key}:{ip}'
    entry = _store.get(store_key)
    if not entry or now > entry['resetAt']:
        _store[store_key] = {'count': 1, 'resetAt': now + window_ms}
        return True, max_attempts - 1, now + window_ms
    if entry['count'] >= max_attempts:
        return False, 0, entry['resetAt']
    entry['count'] += 1
    return True, max_attempts - entry['count'], entry['resetAt']


def is_locked(key: str, subject: str, max_failures: int) -> tuple[bool, int]:
    """Peek-only: is `subject` currently locked out? (does not count attempt)"""
    now = int(time.time() * 1000)
    entry = _store.get(f'{key}:{subject}')
    if not entry or now > entry['resetAt']:
        return False, 0
    if entry['count'] >= max_failures:
        return True, entry['resetAt']
    return False, 0


def record_failure(key: str, subject: str, max_failures: int, window_ms: int) -> tuple[bool, int]:
    """Count a failure for `subject`. Returns (still_allowed, reset_at_epoch_ms)."""
    now = int(time.time() * 1000)
    _sweep(now)
    store_key = f'{key}:{subject}'
    entry = _store.get(store_key)
    if not entry or now > entry['resetAt']:
        _store[store_key] = {'count': 1, 'resetAt': now + window_ms}
        return True, now + window_ms
    entry['count'] += 1
    if entry['count'] >= max_failures:
        return False, entry['resetAt']
    return True, entry['resetAt']


def clear_failures(key: str, subject: str) -> None:
    _store.pop(f'{key}:{subject}', None)


def rate_limited_response(limit: int, reset_at: int) -> JsonResponse:
    now = int(time.time() * 1000)
    retry_after = max(1, (reset_at - now) // 1000)
    resp = JsonResponse({'error': 'Too many requests'}, status=429)
    resp['Retry-After'] = str(retry_after)
    resp['X-RateLimit-Limit'] = str(limit)
    resp['X-RateLimit-Remaining'] = '0'
    resp['X-RateLimit-Reset'] = str(reset_at // 1000)
    return resp

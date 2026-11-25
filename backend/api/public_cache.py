"""Cache public content only; Redis is optional and failures fall back to SQL.

Content generations isolate writes from in-flight reads. Old generations expire
after five minutes; admin mutations never have to scan or clear the Redis DB.
"""
import hashlib
import json
import logging
import time
import uuid
from functools import wraps

from django.conf import settings
from django.core.cache import caches
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.http import JsonResponse
import requests

log = logging.getLogger(__name__)
TTL = 300
_redis_url = None
_redis_client = None
_retry_after = 0


def _store():
    global _redis_url, _redis_client
    url = getattr(settings, 'REDIS_URL', '')
    if not url:
        return caches['default'], False
    if _redis_client is None or _redis_url != url:
        import redis
        _redis_url = url
        _redis_client = redis.Redis.from_url(
            url, decode_responses=True, socket_connect_timeout=0.3,
            socket_timeout=0.3, retry_on_timeout=False,
        )
    return _redis_client, True


def _rest_configured():
    return bool(getattr(settings, 'KV_REST_API_URL', '') and getattr(settings, 'KV_REST_API_TOKEN', ''))


def _rest_command(command):
    base = getattr(settings, 'KV_REST_API_URL', '').rstrip('/')
    token = getattr(settings, 'KV_REST_API_TOKEN', '')
    response = requests.post(
        base, json=command,
        headers={'Authorization': f'Bearer {token}'},
        timeout=(0.5, 1.0),
    )
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, dict) or 'result' not in data:
        raise RuntimeError('invalid KV REST response')
    return data['result']


def _get(key):
    global _retry_after
    if time.monotonic() < _retry_after:
        raise RuntimeError('public cache circuit open')
    try:
        if _rest_configured():
            return _rest_command(['GET', key])
        store, _ = _store()
        return store.get(key)
    except Exception as exc:
        _retry_after = time.monotonic() + 30
        log.warning('Public cache read unavailable (%s); serving from SQL', type(exc).__name__)
        raise


def _set(key, value, *, nx=False):
    if _rest_configured():
        command = ['SET', key, value, 'EX', str(TTL)]
        if nx:
            command.append('NX')
        result = _rest_command(command)
        return result == 'OK' if nx else result
    store, redis_enabled = _store()
    if redis_enabled:
        return store.set(key, value, ex=TTL, nx=nx)
    return store.add(key, value, TTL) if nx else store.set(key, value, TTL)


def _generation(namespace):
    key = f'kamna:public:v1:{namespace}:generation'
    generation = _get(key)
    if generation is None:
        proposed = uuid.uuid4().hex
        _set(key, proposed, nx=True)
        generation = _get(key)
    if not generation:
        raise RuntimeError('public cache generation unavailable')
    return generation


def invalidate(namespace):
    global _retry_after
    try:
        _set(f'kamna:public:v1:{namespace}:generation', uuid.uuid4().hex)
        _retry_after = 0
    except Exception:
        _retry_after = time.monotonic() + 30
        log.warning('Public %s cache invalidation deferred; entries expire within %ss', namespace, TTL)


def public_json(namespace, *, vary_language=False):
    def decorator(view):
        @wraps(view)
        def wrapped(request, *args, **kwargs):
            from .models import SUPPORTED_LANGS
            language = (request.GET.get('lang') or 'en').strip().lower()[:8]
            language = language if language in SUPPORTED_LANGS else 'en'
            variant = f'{request.path}:{language if vary_language else ""}'
            key = None
            cache_state = 'BYPASS'
            try:
                generation = _generation(namespace)
                key = f'kamna:public:v1:{namespace}:{generation}:{hashlib.sha256(variant.encode()).hexdigest()}'
                cached = _get(key)
                if cached is not None:
                    response = JsonResponse(json.loads(cached))
                    cache_state = 'HIT'
                else:
                    response = None
                    cache_state = 'MISS'
            except Exception:
                response = None
            if response is None:
                response = view(request, *args, **kwargs)
                if response.status_code == 200 and key:
                    try:
                        _set(key, response.content.decode())
                    except Exception:
                        log.warning('Public %s cache write failed; serving uncached response', namespace)
            if response.status_code == 200:
                # Browsers keep a short copy; Vercel edges avoid invoking Django
                # on repeated public reads. No admin, session or signup data here.
                response['Cache-Control'] = 'public, max-age=30'
                response['CDN-Cache-Control'] = 'public, s-maxage=60, stale-while-revalidate=60'
                response['Vercel-CDN-Cache-Control'] = 'public, s-maxage=60, stale-while-revalidate=60'
                response['X-Public-Cache'] = cache_state
            else:
                response['Cache-Control'] = 'no-store'
            return response
        return wrapped
    return decorator


def register_invalidation():
    from .models import BlogPost, BlogPostTranslation, LinkedInPost

    def changed(sender, using, **kwargs):
        namespace = 'linkedin' if sender is LinkedInPost else 'blog'
        transaction.on_commit(lambda: invalidate(namespace), using=using)

    for model in (BlogPost, BlogPostTranslation, LinkedInPost):
        for signal in (post_save, post_delete):
            signal.connect(changed, sender=model, weak=False, dispatch_uid=f'public-cache:{model.__name__}:{id(signal)}')

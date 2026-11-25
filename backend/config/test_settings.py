"""Isolated tests: no production database, Redis or email-provider access."""
from .settings import *  # noqa: F403

DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
DATABASE_ROUTERS = []
REDIS_URL = ''
KV_REST_API_URL = ''
KV_REST_API_TOKEN = ''
QSTASH_URL = ''
QSTASH_TOKEN = ''
SENDPULSE_CLIENT_ID = ''
SENDPULSE_CLIENT_SECRET = ''
SENDPULSE_LIST_ID = ''
SENDPULSE_SENDER_EMAIL = ''
ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

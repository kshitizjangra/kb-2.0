import json
import logging
from functools import wraps
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .models import (
    BlogPost,
    BlogPostTranslation,
    ChatMessage,
    ChatThread,
    Email,
    Feedback,
    InstagramReel,
    LeadMagnet,
    LinkedInPost,
    NewsletterIssue,
    SiteSetting,
    Subscriber,
    Testimonial,
)
from .rate_limit import (
    check_limit,
    clear_failures,
    client_ip,
    is_locked,
    rate_limited_response,
    record_failure,
)
from .tokens import create_download_token, verify_download_token
from .public_cache import public_json

logger = logging.getLogger(__name__)

EMAIL_RATE_LIMIT = 5
EMAIL_WINDOW_MS = 60 * 60 * 1000

LOGIN_RATE_LIMIT = 5
LOGIN_WINDOW_MS = 15 * 60 * 1000

# Per-account lockout: independent of IP, survives IP rotation.
LOGIN_ACCOUNT_LIMIT = 10
LOGIN_ACCOUNT_WINDOW_MS = 15 * 60 * 1000


def _json_body(request: HttpRequest):
    try:
        return json.loads(request.body), None
    except Exception:
        return None, JsonResponse({'error': 'Invalid JSON'}, status=400)


@require_http_methods(['GET'])
def index(request: HttpRequest) -> JsonResponse:
    return JsonResponse(
        {
            'service': 'kamna-portfolio-api',
            'status': 'ok',
            'admin_panel': '/admin/',
            'endpoints': [
                'GET  /api/csrf',
                'POST /api/email',
                'POST /api/feedback',
                'GET  /api/blog',
                'GET  /api/blog/<slug>',
                'POST /api/chat/thread',
                'POST /api/chat/message',
                'GET  /api/chat/thread?token=...&after=0',
                'POST /api/newsletter/subscribe',
                'GET  /api/newsletter/unsubscribe?token=...',
                'GET  /api/download?token=...',
                'POST /api/admin/login',
                'GET  /api/admin/emails',
                'GET  /api/admin/feedback',
                'DELETE /api/admin/feedback/<id>',
                'GET  /api/admin/blog',
                'POST /api/admin/blog/create',
                'POST /api/admin/blog/cover/upload',
                'PATCH /api/admin/blog/<slug>',
                'DELETE /api/admin/blog/<slug>/delete',
                'GET  /api/admin/blog/<slug>/translations',
                'POST /api/admin/blog/<slug>/translations',
                'DELETE /api/admin/blog/<slug>/translations/<lang>',
                'GET  /api/social/linkedin',
                'GET  /api/social/instagram',
                'GET  /api/admin/social',
                'POST /api/admin/social/linkedin',
                'PATCH /api/admin/social/linkedin/<id>',
                'DELETE /api/admin/social/linkedin/<id>',
                'POST /api/admin/social/instagram',
                'PATCH /api/admin/social/instagram/<id>',
                'DELETE /api/admin/social/instagram/<id>',
                'GET  /api/admin/chat',
                'GET  /api/admin/chat/<token>',
                'POST /api/admin/chat/<token>/reply',
                'DELETE /api/admin/chat/<token>',
            ],
        }
    )


@ensure_csrf_cookie
@require_http_methods(['GET'])
def csrf_token(request: HttpRequest) -> JsonResponse:
    return JsonResponse({'ok': True})


@require_http_methods(['POST'])
def submit_email(request: HttpRequest) -> JsonResponse:
    ip = client_ip(request)
    allowed, _, reset_at = check_limit('email', ip, EMAIL_RATE_LIMIT, EMAIL_WINDOW_MS)
    if not allowed:
        return rate_limited_response(EMAIL_RATE_LIMIT, reset_at)

    body, err = _json_body(request)
    if err:
        return err

    email = (body or {}).get('email')
    if not isinstance(email, str):
        return JsonResponse({'error': 'Invalid email address'}, status=422)
    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({'error': 'Invalid email address'}, status=422)
    if len(email) > 254:
        return JsonResponse({'error': 'Email too long'}, status=422)

    user_agent = request.META.get('HTTP_USER_AGENT')
    try:
        Email.objects.update_or_create(
            email=email,
            defaults={'ip': ip, 'user_agent': user_agent},
        )
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)

    return JsonResponse({'ok': True, 'token': create_download_token(email)})


def _pdf_response(data: bytes, filename: str) -> HttpResponse:
    safe_name = Path(filename or '').name.replace('"', '').replace('\x00', '')
    if not safe_name:
        safe_name = 'decoded_linkedin_creators.pdf'
    resp = HttpResponse(data, content_type='application/pdf')
    resp['Content-Disposition'] = f'attachment; filename="{safe_name}"'
    resp['Cache-Control'] = 'no-store'
    return resp


def _lead_magnet_row() -> LeadMagnet | None:
    return LeadMagnet.objects.filter(key=LeadMagnet.KEY_DEFAULT).first()


@require_http_methods(['GET'])
def download(request: HttpRequest):
    token = request.GET.get('token')
    if not token or not verify_download_token(token):
        return JsonResponse({'error': 'Invalid or expired link'}, status=403)

    # PDF lives in Postgres: serverless FS is read-only + ephemeral.
    row = _lead_magnet_row()
    if row is not None:
        return _pdf_response(row.content, row.filename)

    # Local dev fallback: bundled backend/assets/lead-magnet.pdf
    pdf_path = Path(settings.LEAD_MAGNET_PDF)
    if not pdf_path.is_file():
        return JsonResponse({'error': 'File unavailable'}, status=500)
    return _pdf_response(pdf_path.read_bytes(), 'decoded_linkedin_creators.pdf')


@require_http_methods(['POST'])
def admin_login(request: HttpRequest) -> JsonResponse:
    """Sign in with a Django staff user: {identifier, password}.

    Identifier accepts username or email. On success sets a 24h session.
    """
    ip = client_ip(request)
    allowed, _, reset_at = check_limit(
        'login', ip, LOGIN_RATE_LIMIT, LOGIN_WINDOW_MS
    )
    if not allowed:
        logger.warning('login rate-limited ip=%s', ip)
        return rate_limited_response(LOGIN_RATE_LIMIT, reset_at)

    body, err = _json_body(request)
    if err:
        return err

    identifier = (body or {}).get('identifier')
    password = (body or {}).get('password')
    if not isinstance(identifier, str) or not identifier.strip():
        return JsonResponse({'error': 'Username or email required'}, status=422)
    identifier = identifier.strip()
    if len(identifier) > 254:
        return JsonResponse({'error': 'Username or email too long'}, status=422)
    if not isinstance(password, str) or len(password) < 1:
        return JsonResponse({'error': 'Password required'}, status=422)
    if len(password) > 128:
        return JsonResponse({'error': 'Password too long'}, status=422)

    # Per-account lockout — blocks brute force even when attacker rotates IPs.
    acct_key = identifier.lower()
    locked, reset_at = is_locked('login_acct', acct_key, LOGIN_ACCOUNT_LIMIT)
    if locked:
        logger.warning('login locked out identifier=%r ip=%s', identifier, ip)
        return rate_limited_response(LOGIN_ACCOUNT_LIMIT, reset_at)

    from django.contrib.auth.models import User

    user = (
        User.objects.filter(username__exact=identifier).first()
        or User.objects.filter(email__iexact=identifier).first()
    )
    valid = (
        user is not None
        and user.is_active
        and (user.is_staff or user.is_superuser)
        and user.check_password(password)
    )
    if not valid:
        still_allowed, reset_at = record_failure(
            'login_acct', acct_key, LOGIN_ACCOUNT_LIMIT, LOGIN_ACCOUNT_WINDOW_MS
        )
        logger.warning(
            'admin login failed identifier=%r ip=%s locked=%s',
            identifier,
            ip,
            not still_allowed,
        )
        if not still_allowed:
            return rate_limited_response(LOGIN_ACCOUNT_LIMIT, reset_at)
        return JsonResponse(
            {'error': 'Invalid username/email or password'}, status=401
        )

    clear_failures('login_acct', acct_key)
    request.session.cycle_key()
    request.session['admin'] = True
    request.session['admin_user_id'] = user.id
    request.session['admin_username'] = user.username
    logger.info('admin login ok identifier=%r ip=%s', identifier, ip)
    return JsonResponse({'ok': True, 'user': user.username})


@require_http_methods(['POST'])
def admin_logout(request: HttpRequest) -> JsonResponse:
    """Flush the admin session — makes logout actually effective."""
    if request.session.get('admin'):
        logger.info(
            'admin logout user=%r', request.session.get('admin_username')
        )
    request.session.flush()
    return JsonResponse({'ok': True})


@require_http_methods(['GET'])
def admin_emails(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied

    rows = Email.objects.all().order_by('-created_at')
    payload = [
        {
            'id': r.id,
            'email': r.email,
            'ip': r.ip,
            'userAgent': r.user_agent,
            'createdAt': r.created_at.strftime('%Y-%m-%d %H:%M:%S')
            if r.created_at
            else None,
        }
        for r in rows
    ]
    return JsonResponse({'emails': payload})


def _translation_for(post, lang: str):
    if not lang or lang == 'en':
        return None
    if hasattr(post, 'requested_translations'):
        return next((translation for translation in post.requested_translations if translation.lang == lang), None)
    try:
        return post.translations.get(lang=lang)
    except BlogPostTranslation.DoesNotExist:
        return None


def _post_to_dict(post, full: bool = False, lang: str = 'en') -> dict:
    data = {
        'id': post.id,
        'title': post.title,
        'slug': post.slug,
        'excerpt': post.excerpt,
        'coverImage': post.cover_image,
        'mediumUrl': post.medium_url,
        'authorName': post.author_name,
        'authorPhoto': post.author_photo,
        'publishedAt': post.published_at.strftime('%Y-%m-%d')
        if post.published_at
        else None,
        'isPublished': post.is_published,
    }
    tr = _translation_for(post, lang)
    data['lang'] = lang if tr is not None or lang == 'en' else 'en'
    if tr is not None:
        data['title'] = tr.title
        data['excerpt'] = tr.excerpt
    if full:
        data['bodyHtml'] = tr.body_html if tr is not None else post.body_html
    return data


def _request_lang(request: HttpRequest) -> str:
    from .models import SUPPORTED_LANGS

    lang = (request.GET.get('lang') or 'en').strip().lower()[:8]
    return lang if lang in SUPPORTED_LANGS else 'en'


@require_http_methods(['GET'])
@public_json('blog', vary_language=True)
def blog_list(request: HttpRequest) -> JsonResponse:
    lang = _request_lang(request)
    posts = BlogPost.objects.filter(is_published=True).defer('body_html')
    if lang != 'en':
        from django.db.models import Prefetch
        posts = posts.prefetch_related(Prefetch(
            'translations', queryset=BlogPostTranslation.objects.filter(lang=lang).defer('body_html'),
            to_attr='requested_translations',
        ))
    return JsonResponse(
        {'posts': [_post_to_dict(p, lang=lang) for p in posts]}
    )


@require_http_methods(['GET'])
@public_json('blog', vary_language=True)
def blog_detail(request: HttpRequest, slug: str) -> JsonResponse:
    lang = _request_lang(request)
    try:
        post = BlogPost.objects.get(slug=slug, is_published=True)
    except BlogPost.DoesNotExist:
        return JsonResponse({'error': 'Post not found'}, status=404)
    return JsonResponse({'post': _post_to_dict(post, full=True, lang=lang)})


FEEDBACK_RATE_LIMIT = 5
FEEDBACK_WINDOW_MS = 60 * 60 * 1000


@require_http_methods(['POST'])
def submit_feedback(request: HttpRequest) -> JsonResponse:
    ip = client_ip(request)
    allowed, _, reset_at = check_limit(
        'feedback', ip, FEEDBACK_RATE_LIMIT, FEEDBACK_WINDOW_MS
    )
    if not allowed:
        return rate_limited_response(FEEDBACK_RATE_LIMIT, reset_at)

    body, err = _json_body(request)
    if err:
        return err
    body = body or {}

    name = body.get('name')
    email = body.get('email')
    message = body.get('message')

    if not isinstance(name, str) or not name.strip():
        return JsonResponse({'error': 'Name required'}, status=422)
    if len(name.strip()) > 120:
        return JsonResponse({'error': 'Name too long'}, status=422)
    if not isinstance(email, str):
        return JsonResponse({'error': 'Invalid email address'}, status=422)
    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({'error': 'Invalid email address'}, status=422)
    if len(email) > 254:
        return JsonResponse({'error': 'Email too long'}, status=422)
    if not isinstance(message, str) or not message.strip():
        return JsonResponse({'error': 'Message required'}, status=422)
    if len(message.strip()) > 2000:
        return JsonResponse({'error': 'Message too long (max 2000)'}, status=422)

    try:
        Feedback.objects.create(
            name=name.strip(),
            email=email.strip(),
            message=message.strip(),
            ip=ip,
            user_agent=request.META.get('HTTP_USER_AGENT'),
        )
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)

    return JsonResponse({'ok': True})


def _require_admin(request: HttpRequest):
    if not request.session.get('admin'):
        logger.warning(
            'admin denied path=%s ip=%s', request.path, client_ip(request)
        )
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    return None


@require_http_methods(['GET'])
def admin_feedback(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    rows = Feedback.objects.all()
    payload = [
        {
            'id': r.id,
            'name': r.name,
            'email': r.email,
            'message': r.message,
            'ip': r.ip,
            'createdAt': r.created_at.strftime('%Y-%m-%d %H:%M:%S')
            if r.created_at
            else None,
        }
        for r in rows
    ]
    return JsonResponse({'feedback': payload})


@require_http_methods(['DELETE'])
def admin_feedback_delete(request: HttpRequest, pk: int) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        Feedback.objects.get(pk=pk).delete()
    except Feedback.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    return JsonResponse({'ok': True})


def _unique_slug(base: str, ignore_id=None) -> str:
    from django.utils.text import slugify

    base = slugify(base or '')[:300] or 'post'
    slug, suffix = base, 2
    while BlogPost.objects.filter(slug=slug).exclude(pk=ignore_id).exists():
        slug = f'{base}-{suffix}'
        suffix += 1
    return slug


def _parse_publish_date(value) -> tuple:
    """Returns (datetime|None, error_response|None)."""
    from datetime import datetime

    if value in (None, ''):
        return None, None
    if not isinstance(value, str):
        return None, JsonResponse({'error': 'Invalid date'}, status=422)
    for fmt in ('%Y-%m-%d', '%Y-%m-%d %H:%M:%S'):
        try:
            dt = datetime.strptime(value.strip(), fmt)
            from datetime import timezone as dt_timezone

            return dt.replace(tzinfo=dt_timezone.utc), None
        except ValueError:
            continue
    return None, JsonResponse({'error': 'Invalid date'}, status=422)


@require_http_methods(['GET'])
def admin_blog_list(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    posts = BlogPost.objects.all().order_by('-published_at', '-id')
    return JsonResponse({'posts': [_post_to_dict(p) for p in posts]})


@require_http_methods(['POST'])
def admin_blog_create(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied

    body, err = _json_body(request)
    if err:
        return err
    body = body or {}

    title = body.get('title')
    if not isinstance(title, str) or not title.strip():
        return JsonResponse({'error': 'Title required'}, status=422)
    if len(title.strip()) > 300:
        return JsonResponse({'error': 'Title too long'}, status=422)

    is_published = bool(body.get('is_published', False))
    body_html = body.get('body_html', '')
    if not isinstance(body_html, str):
        return JsonResponse({'error': 'Invalid body'}, status=422)
    if is_published and not body_html.strip():
        return JsonResponse(
            {'error': 'Body required to publish'}, status=422
        )

    slug = body.get('slug') or ''
    slug = (
        _unique_slug(slug)
        if isinstance(slug, str) and slug.strip()
        else _unique_slug(title)
    )

    published_at, date_err = _parse_publish_date(body.get('published_at'))
    if date_err:
        return date_err
    if published_at is None:
        from django.utils import timezone as dj_timezone

        published_at = dj_timezone.now()

    try:
        post = BlogPost.objects.create(
            title=title.strip(),
            slug=slug,
            excerpt=(body.get('excerpt') or '')[:2000]
            if isinstance(body.get('excerpt'), str)
            else '',
            body_html=body_html,
            cover_image=body.get('cover_image', '')
            if isinstance(body.get('cover_image'), str)
            else '',
            medium_url=body.get('medium_url', '')
            if isinstance(body.get('medium_url'), str)
            else '',
            author_name=body.get('author_name') or 'Kamna Bhardwaj'
            if isinstance(body.get('author_name'), str)
            else 'Kamna Bhardwaj',
            author_photo=body.get('author_photo') or '/blog/author-kamna.jpg'
            if isinstance(body.get('author_photo'), str)
            else '/blog/author-kamna.jpg',
            published_at=published_at,
            is_published=is_published,
        )
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)
    return JsonResponse({'post': _post_to_dict(post, full=True)}, status=201)


@require_http_methods(['PATCH'])
def admin_blog_update(request: HttpRequest, slug: str) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        post = BlogPost.objects.get(slug=slug)
    except BlogPost.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    body, err = _json_body(request)
    if err:
        return err
    body = body or {}

    if 'title' in body:
        title = body['title']
        if not isinstance(title, str) or not title.strip():
            return JsonResponse({'error': 'Title required'}, status=422)
        if len(title.strip()) > 300:
            return JsonResponse({'error': 'Title too long'}, status=422)
        post.title = title.strip()
    if 'slug' in body and isinstance(body['slug'], str) and body['slug'].strip():
        post.slug = _unique_slug(body['slug'].strip(), ignore_id=post.pk)
    if 'excerpt' in body and isinstance(body['excerpt'], str):
        post.excerpt = body['excerpt'][:2000]
    if 'body_html' in body:
        if not isinstance(body['body_html'], str):
            return JsonResponse({'error': 'Invalid body'}, status=422)
        post.body_html = body['body_html']
    if 'cover_image' in body and isinstance(body['cover_image'], str):
        post.cover_image = body['cover_image']
    if 'medium_url' in body and isinstance(body['medium_url'], str):
        post.medium_url = body['medium_url']
    if 'author_name' in body and isinstance(body['author_name'], str):
        post.author_name = body['author_name'] or 'Kamna Bhardwaj'
    if 'author_photo' in body and isinstance(body['author_photo'], str):
        post.author_photo = body['author_photo'] or '/blog/author-kamna.jpg'
    if 'published_at' in body:
        published_at, date_err = _parse_publish_date(body['published_at'])
        if date_err:
            return date_err
        if published_at is not None:
            post.published_at = published_at
    if 'is_published' in body:
        post.is_published = bool(body['is_published'])

    if post.is_published and not (post.body_html or '').strip():
        return JsonResponse({'error': 'Body required to publish'}, status=422)

    try:
        post.save()
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)
    post.refresh_from_db()
    return JsonResponse({'post': _post_to_dict(post, full=True)})


@require_http_methods(['DELETE'])
def admin_blog_delete(request: HttpRequest, slug: str) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        BlogPost.objects.get(slug=slug).delete()
    except BlogPost.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    return JsonResponse({'ok': True})


LEAD_MAGNET_MAX_BYTES = 25 * 1024 * 1024


def _lead_magnet_info() -> dict:
    from datetime import datetime, timezone as dt_timezone

    row = _lead_magnet_row()
    if row is not None:
        return {
            'exists': True,
            'filename': row.filename,
            'size': row.size,
            'updatedAt': row.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
        }

    pdf_path = Path(settings.LEAD_MAGNET_PDF)
    if not pdf_path.is_file():
        return {'exists': False}
    stat = pdf_path.stat()
    modified = datetime.fromtimestamp(stat.st_mtime, tz=dt_timezone.utc).strftime(
        '%Y-%m-%d %H:%M:%S'
    )
    return {
        'exists': True,
        'filename': pdf_path.name,
        'size': stat.st_size,
        'updatedAt': modified,
    }


@require_http_methods(['GET'])
def admin_lead_magnet(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    return JsonResponse(_lead_magnet_info())


@require_http_methods(['POST'])
def admin_lead_magnet_upload(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied

    upload = request.FILES.get('file')
    if upload is None:
        return JsonResponse({'error': 'No file provided'}, status=422)
    if upload.size > LEAD_MAGNET_MAX_BYTES:
        return JsonResponse({'error': 'File too large (max 25 MB)'}, status=422)

    head = upload.read(5)
    upload.seek(0)
    content_type = (upload.content_type or '').split(';')[0].strip().lower()
    if content_type != 'application/pdf' or not head.startswith(b'%PDF'):
        return JsonResponse(
            {'error': 'Only PDF files are accepted'}, status=422
        )

    filename = Path(upload.name or '').name[:100] or 'lead-magnet.pdf'
    try:
        data = b''.join(upload.chunks())
        LeadMagnet.objects.update_or_create(
            key=LeadMagnet.KEY_DEFAULT,
            defaults={'filename': filename, 'data': data, 'size': len(data)},
        )
    except Exception:
        logger.exception('lead-magnet upload failed')
        return JsonResponse({'error': 'Upload failed'}, status=500)

    return JsonResponse(
        {
            'ok': True,
            'uploaded_name': filename,
            **_lead_magnet_info(),
        }
    )


BLOG_COVER_MAX_BYTES = 5 * 1024 * 1024

BLOG_COVER_TYPES = {
    'image/jpeg': ('.jpg', b'\xff\xd8\xff'),
    'image/png': ('.png', b'\x89PNG\r\n\x1a\n'),
    'image/webp': ('.webp', b'RIFF'),
}


@require_http_methods(['POST'])
def admin_blog_cover_upload(request: HttpRequest) -> JsonResponse:
    from pathlib import Path
    import re
    import time

    denied = _require_admin(request)
    if denied:
        return denied

    upload = request.FILES.get('file')
    if upload is None:
        return JsonResponse({'error': 'No file provided'}, status=422)
    if upload.size > BLOG_COVER_MAX_BYTES:
        return JsonResponse({'error': 'File too large (max 5 MB)'}, status=422)

    head = upload.read(12)
    upload.seek(0)
    content_type = (upload.content_type or '').split(';')[0].strip().lower()
    match = BLOG_COVER_TYPES.get(content_type)
    if match is None or not head.startswith(match[1]):
        return JsonResponse(
            {'error': 'Only JPG, PNG or WebP images are accepted'}, status=422
        )

    stem = re.sub(r'[^a-z0-9]+', '-', (Path(upload.name or 'cover').stem or 'cover').lower()).strip('-') or 'cover'
    filename = f"{stem[:40]}-{int(time.time())}{match[0]}"
    cover_dir = Path(settings.BLOG_COVER_DIR)
    try:
        cover_dir.mkdir(parents=True, exist_ok=True)
        dest = cover_dir / filename
        with open(dest, 'wb') as out:
            for chunk in upload.chunks():
                out.write(chunk)
    except Exception:
        return JsonResponse({'error': 'Upload failed'}, status=500)

    return JsonResponse({'ok': True, 'path': f'/blog/{filename}'})


NEWSLETTER_RATE_LIMIT = 5
NEWSLETTER_WINDOW_MS = 60 * 60 * 1000


def _serialize_newsletter_write(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        denied = _require_admin(request)
        if denied:
            return denied
        from .newsletter import delivery_lock
        with delivery_lock():
            return view(request, *args, **kwargs)
    return wrapped


@require_http_methods(['POST'])
def subscribe_newsletter(request: HttpRequest) -> JsonResponse:
    ip = client_ip(request)
    allowed, _, reset_at = check_limit(
        'newsletter', ip, NEWSLETTER_RATE_LIMIT, NEWSLETTER_WINDOW_MS
    )
    if not allowed:
        return rate_limited_response(NEWSLETTER_RATE_LIMIT, reset_at)

    body, err = _json_body(request)
    if err:
        return err
    body = body or {}
    if not isinstance(body, dict):
        return JsonResponse({'error': 'Expected a JSON object'}, status=400)
    if body.get('website'):
        return JsonResponse({'ok': True, 'status': 'pending'}, status=202)
    if body.get('consent') is not True:
        return JsonResponse({'error': 'Please agree to receive the newsletter.'}, status=422)

    email = body.get('email')
    if not isinstance(email, str):
        return JsonResponse({'error': 'Invalid email address'}, status=422)
    email = email.strip().casefold()
    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({'error': 'Invalid email address'}, status=422)
    if len(email) > 254:
        return JsonResponse({'error': 'Email too long'}, status=422)
    name = body.get('name') or ''
    if not isinstance(name, str) or len(name) > 120:
        return JsonResponse({'error': 'Invalid name'}, status=422)

    from .newsletter import signup
    from .sendpulse import NewsletterError

    source = 'pdf' if body.get('source') == 'pdf' else 'newsletter'
    try:
        signup(email, name.strip(), source)
    except NewsletterError as exc:
        message = ('Newsletter signup is being set up or temporarily unavailable. Please try again soon.'
                   if exc.status == 503 else str(exc))
        return JsonResponse({'error': message}, status=exc.status)
    return JsonResponse({'ok': True, 'status': 'pending', 'message': 'If eligible, check your inbox and confirm your subscription.'}, status=202)


@ensure_csrf_cookie
@require_http_methods(['GET', 'POST'])
def unsubscribe_newsletter(request: HttpRequest):
    from django.middleware.csrf import get_token
    from django.utils.html import escape
    from .newsletter import unsubscribe, verify_unsubscribe_token
    from .sendpulse import NewsletterError

    token = request.GET.get('token') or request.POST.get('token') or ''
    email = verify_unsubscribe_token(token)
    if not email:
        return HttpResponse(
            '<h1>Invalid link</h1><p>This unsubscribe link is not valid.</p>',
            status=400,
            content_type='text/html',
        )
    if request.method == 'GET':
        # Mail security scanners follow GET links. Only an explicit POST opts out.
        return HttpResponse(
            '<h1>Leave Kamna’s newsletter?</h1><form method="post">'
            f'<input type="hidden" name="csrfmiddlewaretoken" value="{escape(get_token(request))}">'
            f'<input type="hidden" name="token" value="{escape(token)}">'
            '<button type="submit">Unsubscribe</button></form>', content_type='text/html',
        )
    try:
        unsubscribe(email)
    except NewsletterError:
        logger.warning('Newsletter opt-out saved locally; provider sync is pending')
    return HttpResponse(
        '<h1>Unsubscribed</h1><p>You will no longer receive the newsletter.</p>',
        content_type='text/html',
    )


def _issue_to_dict(issue, full: bool = False) -> dict:
    data = {
        'id': issue.id,
        'subject': issue.subject,
        'status': issue.status,
        'recipientCount': issue.recipient_count,
        'providerCampaignId': issue.provider_campaign_id,
        'lastError': issue.last_error,
        'deliveredCount': issue.delivered_count,
        'openedCount': issue.opened_count,
        'clickedCount': issue.clicked_count,
        'bouncedCount': issue.bounced_count,
        'createdAt': issue.created_at.strftime('%Y-%m-%d %H:%M:%S')
        if issue.created_at
        else None,
        'sentAt': issue.sent_at.strftime('%Y-%m-%d %H:%M:%S')
        if issue.sent_at
        else None,
    }
    if full:
        from .newsletter import email_html
        data['bodyHtml'] = issue.body_html
        data['previewHtml'] = email_html(issue.body_html, preview=True)
    return data


@require_http_methods(['GET'])
def admin_subscribers(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    rows = Subscriber.objects.all()
    payload = [
        {
            'id': r.id,
            'email': r.email,
            'name': r.name,
            'isActive': r.is_active,
            'status': r.status,
            'source': r.source,
            'welcomeStatus': r.welcome_status,
            'createdAt': r.created_at.strftime('%Y-%m-%d %H:%M:%S')
            if r.created_at
            else None,
        }
        for r in rows
    ]
    return JsonResponse({'subscribers': payload})


@require_http_methods(['DELETE'])
@_serialize_newsletter_write
def admin_subscriber_delete(request: HttpRequest, pk: int) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        row = Subscriber.objects.get(pk=pk)
    except Subscriber.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    from .newsletter import unsubscribe
    from .sendpulse import NewsletterError
    try:
        unsubscribe(row.email)
    except NewsletterError as exc:
        return JsonResponse({'error': 'Opt-out saved. Provider removal is pending; sync and retry.'}, status=exc.status)
    row.delete()
    return JsonResponse({'ok': True})


@require_http_methods(['GET'])
def admin_issues(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    issues = NewsletterIssue.objects.all()
    return JsonResponse({'issues': [_issue_to_dict(i) for i in issues]})


@require_http_methods(['GET'])
def admin_issue_detail(request: HttpRequest, pk: int) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        issue = NewsletterIssue.objects.get(pk=pk)
    except NewsletterIssue.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    return JsonResponse({'issue': _issue_to_dict(issue, full=True)})


@require_http_methods(['POST'])
def admin_issue_create(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    body, err = _json_body(request)
    if err:
        return err
    body = body or {}
    if not isinstance(body, dict):
        return JsonResponse({'error': 'Expected a JSON object'}, status=400)

    subject = body.get('subject')
    if not isinstance(subject, str) or not subject.strip():
        return JsonResponse({'error': 'Subject required'}, status=422)
    if len(subject.strip()) > 300:
        return JsonResponse({'error': 'Subject too long'}, status=422)
    body_html = body.get('body_html', '')
    if not isinstance(body_html, str) or len(body_html) > 100000:
        return JsonResponse({'error': 'Body must be text under 100,000 characters'}, status=422)

    try:
        from django.utils.html import strip_tags

        cleaned_subject = strip_tags(subject).strip()
        if not cleaned_subject:
            return JsonResponse({'error': 'Subject required'}, status=422)
        issue = NewsletterIssue.objects.create(subject=cleaned_subject, body_html=body_html)
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)
    return JsonResponse({'issue': _issue_to_dict(issue, full=True)}, status=201)


@require_http_methods(['PATCH'])
@_serialize_newsletter_write
def admin_issue_update(request: HttpRequest, pk: int) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        issue = NewsletterIssue.objects.get(pk=pk)
    except NewsletterIssue.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if issue.status not in ('draft', 'failed') or issue.provider_campaign_id or issue.send_attempts.db_manager('default').filter(status__in=['creating', 'unknown']).exists():
        return JsonResponse({'error': 'Only unsubmitted drafts can be edited'}, status=422)

    body, err = _json_body(request)
    if err:
        return err
    body = body or {}
    if not isinstance(body, dict):
        return JsonResponse({'error': 'Expected a JSON object'}, status=400)

    if 'subject' in body:
        subject = body['subject']
        if not isinstance(subject, str) or not subject.strip():
            return JsonResponse({'error': 'Subject required'}, status=422)
        if len(subject.strip()) > 300:
            return JsonResponse({'error': 'Subject too long'}, status=422)
        from django.utils.html import strip_tags

        issue.subject = strip_tags(subject).strip()
        if not issue.subject:
            return JsonResponse({'error': 'Subject required'}, status=422)
    if 'body_html' in body:
        if not isinstance(body['body_html'], str) or len(body['body_html']) > 100000:
            return JsonResponse({'error': 'Body must be text under 100,000 characters'}, status=422)
        issue.body_html = body['body_html']
    issue.status, issue.last_error = 'draft', ''
    try:
        issue.save()
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)
    issue.refresh_from_db()
    return JsonResponse({'issue': _issue_to_dict(issue, full=True)})


@require_http_methods(['DELETE'])
@_serialize_newsletter_write
def admin_issue_delete(request: HttpRequest, pk: int) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        issue = NewsletterIssue.objects.get(pk=pk)
    except NewsletterIssue.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if issue.status not in ('draft', 'failed') or issue.provider_campaign_id or issue.send_attempts.db_manager('default').filter(status__in=['creating', 'unknown']).exists():
        return JsonResponse({'error': 'Submitted issues cannot be deleted'}, status=409)
    issue.delete()
    return JsonResponse({'ok': True})


@require_http_methods(['POST'])
def admin_issue_send(request: HttpRequest, pk: int) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    from .newsletter import submit_issue
    from .sendpulse import NewsletterError
    try:
        issue = submit_issue(pk)
    except NewsletterIssue.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except NewsletterError as exc:
        return JsonResponse({'error': str(exc)}, status=exc.status)
    return JsonResponse({'issue': _issue_to_dict(issue), 'queued': True}, status=202)


@require_http_methods(['POST'])
def admin_issue_test(request: HttpRequest, pk: int) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    from .newsletter import submit_issue
    from .sendpulse import NewsletterError
    try:
        submit_issue(pk, is_test=True)
    except NewsletterIssue.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except NewsletterError as exc:
        return JsonResponse({'error': str(exc)}, status=exc.status)
    return JsonResponse({'ok': True, 'email': settings.SENDPULSE_SENDER_EMAIL, 'queued': True}, status=202)


@require_http_methods(['GET'])
def admin_newsletter_status(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    from .newsletter import account_status, FREE_EMAILS, FREE_SUBSCRIBERS
    from .sendpulse import NewsletterError, SendPulse, configured
    data = {'configured': configured(), 'ready': False, 'provider': 'SendPulse',
            'subscriberLimit': FREE_SUBSCRIBERS, 'monthlyLimit': FREE_EMAILS}
    try:
        data.update(account_status(SendPulse()))
        data['ready'] = True
    except NewsletterError as exc:
        data['error'] = str(exc)
    return JsonResponse(data)


@require_http_methods(['POST'])
def admin_newsletter_sync(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    from django.core.cache import cache
    from .newsletter import synchronize
    from .sendpulse import NewsletterError
    if not cache.add('newsletter:sync-lock', True, 30):
        return JsonResponse({'ok': True, 'message': 'Sync is already running.'}, status=202)
    try:
        synchronize()
    except NewsletterError as exc:
        return JsonResponse({'error': str(exc)}, status=exc.status)
    finally:
        cache.delete('newsletter:sync-lock')
    return JsonResponse({'ok': True})


# ---------------------------------------------------------------------------
# Testimonials (Topmate reviews) + site settings
# ---------------------------------------------------------------------------

DEFAULT_SETTINGS = {
    'topmate_ratings_count': '31',
    'topmate_testimonials_count': '31',
    'topmate_url': 'https://topmate.io/kamna_bhardwaj',
}


def _testimonial_to_dict(t) -> dict:
    return {
        'id': t.id,
        'name': t.name,
        'date': t.date_label,
        'text': t.text,
        'rating': t.rating,
        'isVisible': t.is_visible,
        'sortOrder': t.sort_order,
    }


def _get_setting(key: str) -> str:
    try:
        return SiteSetting.objects.get(key=key).value
    except SiteSetting.DoesNotExist:
        return DEFAULT_SETTINGS.get(key, '')


@require_http_methods(['GET'])
def testimonials_public(request: HttpRequest) -> JsonResponse:
    rows = Testimonial.objects.filter(is_visible=True).order_by(
        'sort_order', '-id'
    )
    return JsonResponse(
        {
            'testimonials': [_testimonial_to_dict(t) for t in rows],
            'settings': {k: _get_setting(k) for k in DEFAULT_SETTINGS},
        }
    )


@require_http_methods(['GET'])
def admin_testimonials(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    rows = Testimonial.objects.all().order_by('sort_order', '-id')
    return JsonResponse(
        {
            'testimonials': [_testimonial_to_dict(t) for t in rows],
            'settings': {k: _get_setting(k) for k in DEFAULT_SETTINGS},
        }
    )


def _validate_testimonial(body: dict):
    name = body.get('name')
    text = body.get('text')
    if not isinstance(name, str) or not name.strip():
        return None, JsonResponse({'error': 'Name required'}, status=422)
    if len(name.strip()) > 120:
        return None, JsonResponse({'error': 'Name too long'}, status=422)
    if not isinstance(text, str) or not text.strip():
        return None, JsonResponse({'error': 'Review text required'}, status=422)
    if len(text.strip()) > 2000:
        return None, JsonResponse({'error': 'Review too long'}, status=422)
    date_label = body.get('date', '')
    if not isinstance(date_label, str) or len(date_label) > 20:
        return None, JsonResponse({'error': 'Invalid date'}, status=422)
    try:
        rating = int(body.get('rating', 5))
    except (TypeError, ValueError):
        return None, JsonResponse({'error': 'Invalid rating'}, status=422)
    if rating < 1 or rating > 5:
        return None, JsonResponse({'error': 'Invalid rating'}, status=422)
    try:
        sort_order = int(body.get('sort_order', 0) or 0)
    except (TypeError, ValueError):
        return None, JsonResponse({'error': 'Invalid order'}, status=422)
    return {
        'name': name.strip(),
        'date_label': date_label.strip(),
        'text': text.strip(),
        'rating': rating,
        'is_visible': bool(body.get('is_visible', True)),
        'sort_order': sort_order,
    }, None


@require_http_methods(['POST'])
def admin_testimonial_create(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    body, err = _json_body(request)
    if err:
        return err
    cleaned, verr = _validate_testimonial(body or {})
    if verr:
        return verr
    try:
        t = Testimonial.objects.create(**cleaned)
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)
    return JsonResponse({'testimonial': _testimonial_to_dict(t)}, status=201)


@require_http_methods(['PATCH'])
def admin_testimonial_update(request: HttpRequest, pk: int) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        t = Testimonial.objects.get(pk=pk)
    except Testimonial.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    body, err = _json_body(request)
    if err:
        return err
    body = body or {}
    if 'name' in body:
        name = body['name']
        if not isinstance(name, str) or not name.strip():
            return JsonResponse({'error': 'Name required'}, status=422)
        t.name = name.strip()[:120]
    if 'text' in body:
        text = body['text']
        if not isinstance(text, str) or not text.strip():
            return JsonResponse({'error': 'Review text required'}, status=422)
        t.text = text.strip()[:2000]
    if 'date' in body and isinstance(body['date'], str):
        t.date_label = body['date'].strip()[:20]
    if 'rating' in body:
        try:
            rating = int(body['rating'])
        except (TypeError, ValueError):
            return JsonResponse({'error': 'Invalid rating'}, status=422)
        if rating < 1 or rating > 5:
            return JsonResponse({'error': 'Invalid rating'}, status=422)
        t.rating = rating
    if 'is_visible' in body:
        t.is_visible = bool(body['is_visible'])
    if 'sort_order' in body:
        try:
            t.sort_order = int(body['sort_order'])
        except (TypeError, ValueError):
            return JsonResponse({'error': 'Invalid order'}, status=422)
    try:
        t.save()
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)
    t.refresh_from_db()
    return JsonResponse({'testimonial': _testimonial_to_dict(t)})


@require_http_methods(['DELETE'])
def admin_testimonial_delete(request: HttpRequest, pk: int) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        Testimonial.objects.get(pk=pk).delete()
    except Testimonial.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    return JsonResponse({'ok': True})


@require_http_methods(['PATCH'])
def admin_site_settings(request: HttpRequest) -> JsonResponse:
    """Update Topmate counts / URL: {topmate_ratings_count, ...}."""
    denied = _require_admin(request)
    if denied:
        return denied
    body, err = _json_body(request)
    if err:
        return err
    body = body or {}
    out = {}
    for key in DEFAULT_SETTINGS:
        if key in body and isinstance(body[key], str):
            val = body[key].strip()[:500]
            SiteSetting.objects.update_or_create(
                key=key, defaults={'value': val}
            )
            out[key] = val
        else:
            out[key] = _get_setting(key)
    return JsonResponse({'settings': out})


# ---- Blog translations (Kamna fills per-lang copies in admin) ----


def _translation_to_dict(tr) -> dict:
    return {
        'lang': tr.lang,
        'title': tr.title,
        'excerpt': tr.excerpt,
        'bodyHtml': tr.body_html,
        'updatedAt': tr.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        if tr.updated_at
        else None,
    }


@require_http_methods(['GET'])
def admin_blog_translations(request: HttpRequest, slug: str) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        post = BlogPost.objects.get(slug=slug)
    except BlogPost.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    rows = post.translations.all()
    return JsonResponse(
        {'translations': [_translation_to_dict(t) for t in rows]}
    )


@require_http_methods(['POST'])
def admin_blog_translation_upsert(
    request: HttpRequest, slug: str
) -> JsonResponse:
    from .models import SUPPORTED_LANGS

    denied = _require_admin(request)
    if denied:
        return denied
    try:
        post = BlogPost.objects.get(slug=slug)
    except BlogPost.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    body, err = _json_body(request)
    if err:
        return err
    body = body or {}

    lang = body.get('lang')
    if (
        not isinstance(lang, str)
        or lang.strip().lower() not in SUPPORTED_LANGS
        or lang.strip().lower() == 'en'
    ):
        return JsonResponse({'error': 'Invalid lang'}, status=422)
    lang = lang.strip().lower()

    title = body.get('title')
    if not isinstance(title, str) or not title.strip():
        return JsonResponse({'error': 'Title required'}, status=422)
    if len(title.strip()) > 300:
        return JsonResponse({'error': 'Title too long'}, status=422)
    excerpt = body.get('excerpt', '')
    if not isinstance(excerpt, str):
        return JsonResponse({'error': 'Invalid excerpt'}, status=422)
    body_html = body.get('body_html', '')
    if not isinstance(body_html, str) or not body_html.strip():
        return JsonResponse({'error': 'Body required'}, status=422)

    try:
        tr, _ = BlogPostTranslation.objects.update_or_create(
            post=post,
            lang=lang,
            defaults={
                'title': title.strip(),
                'excerpt': excerpt.strip()[:2000],
                'body_html': body_html,
            },
        )
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)
    return JsonResponse({'translation': _translation_to_dict(tr)})


@require_http_methods(['DELETE'])
def admin_blog_translation_delete(
    request: HttpRequest, slug: str, lang: str
) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        post = BlogPost.objects.get(slug=slug)
    except BlogPost.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    try:
        post.translations.get(lang=lang.strip().lower()).delete()
    except BlogPostTranslation.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    return JsonResponse({'ok': True})


# ---- Social embeds: LinkedIn posts + Instagram reels ----

LINKEDIN_URN_RE = r'^urn:li:(activity|ugcPost|share):\d+$'


def _linkedin_to_dict(row) -> dict:
    return {
        'id': row.id,
        'urn': row.urn,
        'position': row.position,
        'isActive': row.is_active,
    }


def _reel_to_dict(row) -> dict:
    return {
        'id': row.id,
        'url': row.url,
        'code': row.code,
        'position': row.position,
        'isActive': row.is_active,
    }


@require_http_methods(['GET'])
@public_json('linkedin')
def social_linkedin(request: HttpRequest) -> JsonResponse:
    rows = LinkedInPost.objects.filter(is_active=True)
    return JsonResponse({'posts': [_linkedin_to_dict(r) for r in rows]})


@require_http_methods(['GET'])
def social_instagram(request: HttpRequest) -> JsonResponse:
    rows = InstagramReel.objects.filter(is_active=True)
    return JsonResponse({'reels': [_reel_to_dict(r) for r in rows]})


@require_http_methods(['GET'])
def admin_social(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    return JsonResponse(
        {
            'linkedin': [
                _linkedin_to_dict(r) for r in LinkedInPost.objects.all()
            ],
            'instagram': [
                _reel_to_dict(r) for r in InstagramReel.objects.all()
            ],
        }
    )


def _validate_urn(urn) -> str | None:
    import re

    if not isinstance(urn, str):
        return None
    urn = urn.strip()
    if re.match(LINKEDIN_URN_RE, urn):
        return urn
    # Paste-friendly: raw URN buried in embed code or a copied share text
    m = re.search(r'urn:li:(?:activity|ugcPost|share):\d+', urn)
    if m:
        return m.group(0)
    # Paste-friendly: post URLs — /posts/..._activity-123...,
    # _ugcPost-456..., or /feed/update/urn:li:activity:123
    m = re.search(r'(activity|ugcPost)[-.:](\d+)', urn, re.IGNORECASE)
    if m:
        kind = 'ugcPost' if m.group(1).lower() == 'ugcpost' else 'activity'
        return f'urn:li:{kind}:{m.group(2)}'
    return None


def _extract_reel_code(value) -> tuple[str | None, str | None]:
    """Accept full reel URL or bare code. Returns (url, code)."""
    import re

    if not isinstance(value, str) or not value.strip():
        return None, None
    value = value.strip()
    m = re.search(
        r'instagram\.com/(?:reel|reels|p|share)/(?:reel/)?([A-Za-z0-9_-]+)',
        value,
    )
    if m:
        return value, m.group(1)
    if re.fullmatch(r'[A-Za-z0-9_-]{3,120}', value):
        return f'https://www.instagram.com/reel/{value}/', value
    return None, None


@require_http_methods(['POST'])
def admin_linkedin_create(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    body, err = _json_body(request)
    if err:
        return err
    body = body or {}
    urn = _validate_urn(body.get('urn'))
    if not urn:
        return JsonResponse({'error': 'Invalid LinkedIn URN'}, status=422)
    if LinkedInPost.objects.filter(urn=urn).exists():
        return JsonResponse({'error': 'Already added'}, status=422)
    try:
        position = int(body.get('position', 0) or 0)
    except (TypeError, ValueError):
        return JsonResponse({'error': 'Invalid order'}, status=422)
    try:
        row = LinkedInPost.objects.create(
            urn=urn,
            position=position,
            is_active=bool(body.get('is_active', True)),
        )
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)
    return JsonResponse({'post': _linkedin_to_dict(row)}, status=201)


@require_http_methods(['PATCH'])
def admin_linkedin_update(request: HttpRequest, pk: int) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        row = LinkedInPost.objects.get(pk=pk)
    except LinkedInPost.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    body, err = _json_body(request)
    if err:
        return err
    body = body or {}
    if 'urn' in body:
        urn = _validate_urn(body['urn'])
        if not urn:
            return JsonResponse({'error': 'Invalid LinkedIn URN'}, status=422)
        if LinkedInPost.objects.exclude(pk=pk).filter(urn=urn).exists():
            return JsonResponse({'error': 'Already added'}, status=422)
        row.urn = urn
    if 'position' in body:
        try:
            row.position = int(body['position'])
        except (TypeError, ValueError):
            return JsonResponse({'error': 'Invalid order'}, status=422)
    if 'is_active' in body:
        row.is_active = bool(body['is_active'])
    try:
        row.save()
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)
    row.refresh_from_db()
    return JsonResponse({'post': _linkedin_to_dict(row)})


@require_http_methods(['DELETE'])
def admin_linkedin_delete(request: HttpRequest, pk: int) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        LinkedInPost.objects.get(pk=pk).delete()
    except LinkedInPost.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    return JsonResponse({'ok': True})


@require_http_methods(['POST'])
def admin_reel_create(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    body, err = _json_body(request)
    if err:
        return err
    body = body or {}
    url, code = _extract_reel_code(body.get('url') or body.get('code'))
    if not code:
        return JsonResponse({'error': 'Invalid reel URL/code'}, status=422)
    if InstagramReel.objects.filter(code=code).exists():
        return JsonResponse({'error': 'Already added'}, status=422)
    try:
        position = int(body.get('position', 0) or 0)
    except (TypeError, ValueError):
        return JsonResponse({'error': 'Invalid order'}, status=422)
    try:
        row = InstagramReel.objects.create(
            url=url,
            code=code,
            position=position,
            is_active=bool(body.get('is_active', True)),
        )
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)
    return JsonResponse({'reel': _reel_to_dict(row)}, status=201)


@require_http_methods(['PATCH'])
def admin_reel_update(request: HttpRequest, pk: int) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        row = InstagramReel.objects.get(pk=pk)
    except InstagramReel.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    body, err = _json_body(request)
    if err:
        return err
    body = body or {}
    if 'url' in body or 'code' in body:
        url, code = _extract_reel_code(body.get('url') or body.get('code'))
        if not code:
            return JsonResponse(
                {'error': 'Invalid reel URL/code'}, status=422
            )
        if InstagramReel.objects.exclude(pk=pk).filter(code=code).exists():
            return JsonResponse({'error': 'Already added'}, status=422)
        row.url = url
        row.code = code
    if 'position' in body:
        try:
            row.position = int(body['position'])
        except (TypeError, ValueError):
            return JsonResponse({'error': 'Invalid order'}, status=422)
    if 'is_active' in body:
        row.is_active = bool(body['is_active'])
    try:
        row.save()
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)
    row.refresh_from_db()
    return JsonResponse({'reel': _reel_to_dict(row)})


@require_http_methods(['DELETE'])
def admin_reel_delete(request: HttpRequest, pk: int) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        InstagramReel.objects.get(pk=pk).delete()
    except InstagramReel.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    return JsonResponse({'ok': True})


# ---- Live chat: visitor threads + Kamna takeover ----

CHAT_THREAD_LIMIT = 20
CHAT_SEND_LIMIT = 60
CHAT_WINDOW_MS = 60 * 60 * 1000


def _chat_message_to_dict(m) -> dict:
    return {
        'id': m.id,
        'sender': m.sender,
        'text': m.text,
        'createdAt': m.created_at.strftime('%Y-%m-%d %H:%M:%S')
        if m.created_at
        else None,
    }


def _get_thread(token) -> tuple:
    if not isinstance(token, str) or not token.strip():
        return None
    try:
        return ChatThread.objects.get(token=token.strip())
    except ChatThread.DoesNotExist:
        return None


@require_http_methods(['POST'])
def chat_thread_create(request: HttpRequest) -> JsonResponse:
    """Create a thread, or resume if client sends back its token."""
    import secrets

    ip = client_ip(request)
    allowed, _, reset_at = check_limit(
        'chat_thread', ip, CHAT_THREAD_LIMIT, CHAT_WINDOW_MS
    )
    if not allowed:
        return rate_limited_response(CHAT_THREAD_LIMIT, reset_at)

    body, err = _json_body(request)
    if err:
        return err
    existing = _get_thread((body or {}).get('token'))
    if existing is not None:
        msgs = existing.messages.order_by('id')[:100]
        return JsonResponse(
            {
                'token': existing.token,
                'messages': [_chat_message_to_dict(m) for m in msgs],
            }
        )

    token = secrets.token_urlsafe(24)
    try:
        thread = ChatThread.objects.create(token=token, ip=ip)
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)
    return JsonResponse({'token': thread.token, 'messages': []})


@require_http_methods(['POST'])
def chat_message_send(request: HttpRequest) -> JsonResponse:
    """Visitor/bot append. Kamna replies only via admin endpoint."""
    ip = client_ip(request)
    allowed, _, reset_at = check_limit(
        'chat_send', ip, CHAT_SEND_LIMIT, CHAT_WINDOW_MS
    )
    if not allowed:
        return rate_limited_response(CHAT_SEND_LIMIT, reset_at)

    body, err = _json_body(request)
    if err:
        return err
    body = body or {}

    thread = _get_thread(body.get('token'))
    if thread is None:
        return JsonResponse({'error': 'Unknown chat thread'}, status=404)

    sender = body.get('sender')
    if sender not in ('visitor', 'bot'):
        return JsonResponse({'error': 'Invalid sender'}, status=422)
    text = body.get('text')
    if not isinstance(text, str) or not text.strip():
        return JsonResponse({'error': 'Message required'}, status=422)
    if len(text.strip()) > 2000:
        return JsonResponse(
            {'error': 'Message too long (max 2000)'}, status=422
        )

    try:
        msg = ChatMessage.objects.create(
            thread=thread, sender=sender, text=text.strip()
        )
        if sender == 'visitor':
            thread.has_unread = True
            if not thread.label:
                thread.label = text.strip()[:60]
        thread.save()
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)
    return JsonResponse({'message': _chat_message_to_dict(msg)})


@require_http_methods(['GET'])
def chat_thread_messages(request: HttpRequest) -> JsonResponse:
    """Visitor polling: messages after ?after=<id> in own thread."""
    thread = _get_thread(request.GET.get('token'))
    if thread is None:
        return JsonResponse({'error': 'Unknown chat thread'}, status=404)
    try:
        after = int(request.GET.get('after') or 0)
    except (TypeError, ValueError):
        after = 0
    msgs = thread.messages.filter(id__gt=after).order_by('id')[:100]
    return JsonResponse(
        {'messages': [_chat_message_to_dict(m) for m in msgs]}
    )


def _thread_to_dict(thread) -> dict:
    last = thread.messages.order_by('-id').first()
    return {
        'token': thread.token,
        'label': thread.label or thread.token[:8],
        'hasUnread': thread.has_unread,
        'updatedAt': thread.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        if thread.updated_at
        else None,
        'lastMessage': _chat_message_to_dict(last) if last else None,
    }


@require_http_methods(['GET'])
def admin_chat_threads(request: HttpRequest) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    threads = ChatThread.objects.all().order_by('-updated_at')[:50]
    return JsonResponse(
        {'threads': [_thread_to_dict(t) for t in threads]}
    )


@require_http_methods(['GET'])
def admin_chat_detail(request: HttpRequest, token: str) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    thread = _get_thread(token)
    if thread is None:
        return JsonResponse({'error': 'Not found'}, status=404)
    msgs = thread.messages.order_by('id')[:200]
    if thread.has_unread:
        thread.has_unread = False
        thread.save(update_fields=['has_unread'])
    return JsonResponse(
        {
            'thread': _thread_to_dict(thread),
            'messages': [_chat_message_to_dict(m) for m in msgs],
        }
    )


@require_http_methods(['POST'])
def admin_chat_reply(request: HttpRequest, token: str) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    thread = _get_thread(token)
    if thread is None:
        return JsonResponse({'error': 'Not found'}, status=404)

    body, err = _json_body(request)
    if err:
        return err
    text = (body or {}).get('text')
    if not isinstance(text, str) or not text.strip():
        return JsonResponse({'error': 'Message required'}, status=422)
    if len(text.strip()) > 2000:
        return JsonResponse(
            {'error': 'Message too long (max 2000)'}, status=422
        )

    try:
        msg = ChatMessage.objects.create(
            thread=thread, sender='kamna', text=text.strip()
        )
        thread.has_unread = False
        thread.save()
    except Exception:
        return JsonResponse({'error': 'Internal error'}, status=500)
    return JsonResponse({'message': _chat_message_to_dict(msg)})


@require_http_methods(['DELETE'])
def admin_chat_delete(request: HttpRequest, token: str) -> JsonResponse:
    denied = _require_admin(request)
    if denied:
        return denied
    thread = _get_thread(token)
    if thread is None:
        return JsonResponse({'error': 'Not found'}, status=404)
    thread.delete()
    return JsonResponse({'ok': True})

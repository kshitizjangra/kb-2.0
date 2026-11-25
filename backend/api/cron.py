"""Background entrypoints: Vercel Cron sweeper + QStash task runner.

Cron:   GET  /api/cron/run-tasks  (Authorization: Bearer $CRON_SECRET)
QStash: POST /api/tasks/run       (body: {"taskId": "..."})
"""
import hmac
import json

from django.conf import settings
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from . import tasks


@require_http_methods(['GET'])
def run_tasks(request: HttpRequest) -> JsonResponse:
    secret = getattr(settings, 'CRON_SECRET', '') or ''
    auth = request.headers.get('Authorization', '')
    if not secret or not hmac.compare_digest(auth, f'Bearer {secret}'):
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    stats = tasks.drain(max_tasks=5, deadline_s=10.0)
    stats['queued_remaining'] = tasks.queue_depth()
    from .newsletter import synchronize
    from .sendpulse import NewsletterError, configured
    if configured():
        try:
            synchronize(deadline_s=35)
            stats['newsletter'] = 'synced'
        except NewsletterError as exc:
            stats['newsletter'] = str(exc)
    return JsonResponse(stats)


@csrf_exempt
@require_http_methods(['POST'])
def run_task(request: HttpRequest) -> JsonResponse:
    """QStash delivery target — executes one queued task by id.

    Only triggers tasks that are already in our Redis queue (no payload is
    accepted), and a per-task claim prevents duplicate execution across
    delivery paths.
    """
    try:
        body = json.loads(request.body or b'{}')
    except Exception:
        return JsonResponse({'error': 'Invalid body'}, status=400)
    msg_id = body.get('taskId')
    if not isinstance(msg_id, str) or not msg_id or len(msg_id) > 64:
        return JsonResponse({'error': 'taskId required'}, status=400)

    status, detail = tasks.run_queued(msg_id)
    if status == 'failed':
        # Non-2xx → QStash retries with backoff.
        return JsonResponse({'status': status, 'error': detail}, status=500)
    return JsonResponse({'status': status, 'detail': detail})

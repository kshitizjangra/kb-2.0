"""Task queue — celery-style workers on a serverless runtime.

Delivery model:
  1. ``enqueue`` writes the task to Redis (durable source of truth) and
     publishes it to Upstash QStash, which POSTs ``/api/tasks/run`` within
     seconds (with its own retries).
  2. Vercel Cron (daily) plus opportunistic drains on admin list endpoints
     execute anything QStash did not deliver.
  3. Failures retry up to MAX_ATTEMPTS times, then move to a dead-letter list.

A per-task claim key (SET NX) guarantees exactly-once execution across all
delivery paths.
"""
import json
import logging
import time
import uuid

from django.conf import settings

log = logging.getLogger('tasks')

QUEUE_KEY = 'kamna:tasks:queue'
DEAD_KEY = 'kamna:tasks:dead'
CLAIM_PREFIX = 'kamna:tasks:claim:'
CLAIM_TTL_S = 3600
MAX_ATTEMPTS = 3

_client = None

TASKS: dict = {}


def task(fn):
    """Register a function under its own name as the task name."""
    TASKS[fn.__name__] = fn
    return fn


def redis_client():
    global _client
    if _client is not None:
        return _client
    if not getattr(settings, 'REDIS_URL', ''):
        return None
    import redis

    _client = redis.Redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        socket_timeout=5,
        socket_connect_timeout=5,
    )
    return _client


def queue_enabled() -> bool:
    return redis_client() is not None


def enqueue(task_name: str, **payload) -> str | None:
    """Persist a task and push it to QStash. Returns task id.

    Returns None only when there is nowhere at all to put the task.
    """
    print(
        f'[tasks] enqueue {task_name} redis_cfg={bool(getattr(settings, "REDIS_URL", ""))} '
        f'qstash_cfg={bool(getattr(settings, "QSTASH_URL", ""))}',
        flush=True,
    )
    msg = {
        'id': uuid.uuid4().hex,
        'name': task_name,
        'payload': payload,
        'attempts': 0,
        'created_at': time.time(),
    }
    client = redis_client()
    stored = False
    if client is not None:
        try:
            client.lpush(QUEUE_KEY, json.dumps(msg))
            stored = True
        except Exception as exc:
            print(f'[tasks] redis lpush failed: {exc}', flush=True)
    published = _publish_qstash(msg['id']) if stored else False
    if not stored and not published:
        return None
    return msg['id']


def _publish_qstash(msg_id: str) -> bool:
    base = getattr(settings, 'QSTASH_URL', '') or ''
    token = getattr(settings, 'QSTASH_TOKEN', '') or ''
    target = getattr(settings, 'TASK_RUN_URL', '') or ''
    if not (base and token and target):
        print(
            f'[tasks] qstash not configured base={bool(base)} '
            f'token={bool(token)} target={bool(target)}',
            flush=True,
        )
        return False
    import requests

    try:
        resp = requests.post(
            f'{base.rstrip("/")}/v2/publish/{target}',
            data=json.dumps({'taskId': msg_id}),
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
                'Upstash-Method': 'POST',
                'Upstash-Retries': '3',
            },
            timeout=8,
        )
        print(
            f'[tasks] qstash publish {msg_id} target={target!r} -> {resp.status_code} '
            f'{resp.text[:300]}',
            flush=True,
        )
        return resp.ok
    except Exception as exc:
        print(f'[tasks] qstash publish failed for {msg_id}: {exc}', flush=True)
        return False


def _claim(msg_id: str) -> bool:
    client = redis_client()
    if client is None:
        return True
    try:
        return bool(
            client.set(f'{CLAIM_PREFIX}{msg_id}', '1', nx=True, ex=CLAIM_TTL_S)
        )
    except Exception:
        return True


def _release_claim(msg_id: str) -> None:
    client = redis_client()
    if client is None:
        return
    try:
        client.delete(f'{CLAIM_PREFIX}{msg_id}')
    except Exception:
        pass


def _execute(msg: dict) -> None:
    fn = TASKS.get(msg['name'])
    if fn is None:
        raise RuntimeError(f"unknown task '{msg['name']}'")
    fn(**msg['payload'])


def run_queued(msg_id: str) -> tuple[str, str]:
    """Execute a task by id (QStash delivery path).

    Returns (status, detail) where status is 'ok' | 'gone' | 'failed'.
    """
    client = redis_client()
    if client is None:
        return 'gone', 'no_redis'
    try:
        rows = client.lrange(QUEUE_KEY, 0, -1)
    except Exception as exc:
        return 'failed', str(exc)[:300]
    raw = next((r for r in rows if _msg_id(r) == msg_id), None)
    if raw is None:
        return 'gone', 'not_queued'
    if not _claim(msg_id):
        return 'ok', 'already_claimed'
    try:
        _execute(json.loads(raw))
    except Exception as exc:
        _release_claim(msg_id)
        log.warning('task %s failed: %s', msg_id, exc)
        return 'failed', str(exc)[:300]
    try:
        client.lrem(QUEUE_KEY, 1, raw)
    except Exception:
        pass
    return 'ok', 'done'


def _msg_id(raw: str) -> str | None:
    try:
        return json.loads(raw).get('id')
    except Exception:
        return None


def drain(max_tasks: int = 10, deadline_s: float = 25.0) -> dict:
    """Execute queued tasks until empty, time budget hit, or max_tasks hit."""
    stats = {'processed': 0, 'ok': 0, 'retried': 0, 'dead': 0, 'error': None}
    client = redis_client()
    if client is None:
        stats['error'] = 'no_redis'
        return stats
    end = time.monotonic() + deadline_s
    while stats['processed'] < max_tasks and time.monotonic() < end:
        try:
            raw = client.rpop(QUEUE_KEY)
        except Exception as exc:
            stats['error'] = str(exc)[:300]
            break
        if raw is None:
            break
        try:
            msg = json.loads(raw)
        except Exception:
            stats['processed'] += 1
            continue
        claimed = _claim(msg.get('id', ''))
        if not claimed:
            # Another path (QStash) is executing it right now.
            stats['processed'] += 1
            stats['ok'] += 1
            continue
        try:
            _execute(msg)
            stats['ok'] += 1
        except Exception as exc:
            _release_claim(msg.get('id', ''))
            msg['attempts'] = msg.get('attempts', 0) + 1
            msg['last_error'] = str(exc)[:500]
            try:
                if msg['attempts'] >= MAX_ATTEMPTS:
                    client.lpush(DEAD_KEY, json.dumps(msg))
                    stats['dead'] += 1
                    log.error('task dead-lettered: %s %s', msg.get('name'), msg)
                else:
                    client.lpush(QUEUE_KEY, json.dumps(msg))
                    stats['retried'] += 1
                    log.warning(
                        'task retry #%s: %s %s',
                        msg['attempts'],
                        msg.get('name'),
                        exc,
                    )
            except Exception as redis_exc:
                stats['error'] = str(redis_exc)[:300]
        stats['processed'] += 1
    return stats


def queue_depth() -> int:
    client = redis_client()
    if client is None:
        return 0
    try:
        return int(client.llen(QUEUE_KEY))
    except Exception:
        return 0


# ---------------------------------------------------------------------------
# Task implementations
# ---------------------------------------------------------------------------


@task
def send_issue(issue_id: int) -> None:
    """Reconcile old queued jobs without resending an issue through Resend."""
    from .newsletter import synchronize
    from .sendpulse import configured

    if configured():
        synchronize(deadline_s=5)


@task
def send_welcome(email: str, name: str = '') -> None:
    """Legacy jobs cannot bypass confirmation; the new durable outbox owns delivery."""
    from .newsletter import synchronize
    from .sendpulse import configured
    if configured():
        synchronize(deadline_s=5)

#!/usr/bin/env bash
# Start Django API on :8765 (reads backend/.env automatically)
set -e
cd "$(dirname "$0")"

echo "Django API → http://localhost:8765  (admin panel: /admin/)"
exec .venv/bin/python manage.py runserver 0.0.0.0:8765

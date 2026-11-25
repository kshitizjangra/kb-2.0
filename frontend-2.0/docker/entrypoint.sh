#!/bin/sh
set -eu

export PORT="${PORT:-10000}"

envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

npx next start -p 3000 -H 127.0.0.1 &
NEXT_PID=$!

cleanup() {
  kill -TERM "$NEXT_PID" 2>/dev/null || true
}
trap cleanup TERM INT

exec nginx -g 'daemon off;'

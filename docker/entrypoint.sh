#!/bin/sh
set -eu

echo "→ applying database migrations"
node /app/docker/migrate.cjs

echo "→ starting gohiking.club on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec node /app/server.js

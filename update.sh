#!/bin/bash
set -e

echo "=== Pulling latest code from main ==="
cd /opt/DMS-TRESVANCE
git fetch origin
git reset --hard origin/main

echo "=== Rebuilding containers ==="
docker compose -f docker-compose.prod.yml up --build -d

echo "=== Waiting for backend ==="
sleep 10

echo "=== Running migrations ==="
docker exec dms_backend_prod python manage.py migrate

echo "=== Collecting static files ==="
docker exec dms_backend_prod python manage.py collectstatic --noinput

echo "=== Done! ==="
docker ps | grep dms
#!/bin/bash

# Config
CONTAINER="dms_db_prod"
DB_NAME="dms_tresvance"
DB_USER="postgres"
BACKUP_DIR="/opt/DMS-TRESVANCE/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Run backup
echo "Starting backup..."
docker exec $CONTAINER pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE

# Compress it
gzip $BACKUP_FILE

echo "Backup saved to $BACKUP_FILE.gz"

# Delete backups older than 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
echo "Old backups cleaned up"

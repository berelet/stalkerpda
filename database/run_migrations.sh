#!/bin/bash
# Run database migrations

set -e

DB_HOST=${DB_HOST:-"pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com"}
DB_USER=${DB_USER:-"pda_admin"}
DB_NAME=${DB_NAME:-"pda_zone"}
DB_PASSWORD=${DB_PASSWORD}

if [ -z "$DB_PASSWORD" ]; then
    echo "Error: DB_PASSWORD not set"
    echo "Usage: DB_PASSWORD=xxx ./run_migrations.sh"
    exit 1
fi

MIGRATIONS_DIR="$(dirname "$0")/migrations"

echo "🗄️  Running migrations on $DB_HOST..."

for migration in "$MIGRATIONS_DIR"/*.sql; do
    filename=$(basename "$migration")
    echo "  ▶ Applying $filename..."
    
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$migration"
    
    if [ $? -eq 0 ]; then
        echo "  ✅ $filename applied successfully"
    else
        echo "  ❌ $filename failed"
        exit 1
    fi
done

echo ""
echo "✅ All migrations completed successfully!"

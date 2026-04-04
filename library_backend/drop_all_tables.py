"""
Drop ALL user-created tables from the Neon PostgreSQL database so we can
run a completely fresh migration.
"""
import os, django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Get all table names in the public schema
    cursor.execute("""
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
    """)
    tables = [row[0] for row in cursor.fetchall()]
    print(f"Found {len(tables)} tables: {tables}")

    if tables:
        # Drop everything — CASCADE handles foreign keys
        drop_sql = "DROP TABLE IF EXISTS " + ", ".join(f'"{t}"' for t in tables) + " CASCADE;"
        print(f"Executing: {drop_sql}")
        cursor.execute(drop_sql)
        print("All tables dropped successfully.")
    else:
        print("No tables found — database is already empty.")

print("Done!")

#!/usr/bin/env python
"""
Apply migrations for accounts and notifications apps
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from django.core.management import call_command
from django.db import connection

# Check if tables exist
cursor = connection.cursor()
cursor.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('accounts', 'account_members', 'notifications')
""")
existing_tables = [row[0] for row in cursor.fetchall()]
print(f"Existing tables: {existing_tables}")

# Apply migrations by executing SQL directly if tables don't exist
if 'accounts' not in existing_tables:
    print("Creating accounts and account_members tables...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS accounts (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(20) NOT NULL DEFAULT 'PERSONAL',
            description TEXT NOT NULL DEFAULT '',
            owner_id INTEGER NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS accounts_owner_created_idx ON accounts(owner_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS accounts_type_created_idx ON accounts(type, created_at DESC);
        CREATE INDEX IF NOT EXISTS accounts_name_idx ON accounts(name);
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS account_members (
            id BIGSERIAL PRIMARY KEY,
            account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            can_add_entry BOOLEAN NOT NULL DEFAULT TRUE,
            can_edit_own_entry BOOLEAN NOT NULL DEFAULT TRUE,
            can_edit_all_entries BOOLEAN NOT NULL DEFAULT FALSE,
            can_delete_entry BOOLEAN NOT NULL DEFAULT FALSE,
            can_view_reports BOOLEAN NOT NULL DEFAULT TRUE,
            can_manage_members BOOLEAN NOT NULL DEFAULT FALSE,
            invited_by_id INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
            invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            accepted_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            UNIQUE(account_id, user_id)
        );
        
        CREATE INDEX IF NOT EXISTS account_members_account_status_idx ON account_members(account_id, status);
        CREATE INDEX IF NOT EXISTS account_members_user_status_idx ON account_members(user_id, status);
        CREATE INDEX IF NOT EXISTS account_members_status_invited_idx ON account_members(status, invited_at DESC);
    """)
    connection.commit()
    print("Accounts tables created!")

if 'notifications' not in existing_tables:
    print("Creating notifications table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id BIGSERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
            triggered_by_id INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
            read BOOLEAN NOT NULL DEFAULT FALSE,
            read_at TIMESTAMP WITH TIME ZONE,
            data JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS notifications_user_read_created_idx ON notifications(user_id, read, created_at DESC);
        CREATE INDEX IF NOT EXISTS notifications_account_created_idx ON notifications(account_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS notifications_type_created_idx ON notifications(type, created_at DESC);
    """)
    connection.commit()
    print("Notifications table created!")

# Record migrations in django_migrations table
from django.db import transaction
from django.utils import timezone

with transaction.atomic():
    cursor.execute("SELECT app, name FROM django_migrations WHERE app IN ('accounts', 'notifications')")
    existing_migrations = {row[0]: row[1] for row in cursor.fetchall()}
    
    if 'accounts' not in existing_migrations or existing_migrations.get('accounts') != '0001_initial':
        cursor.execute("""
            INSERT INTO django_migrations (app, name, applied)
            VALUES ('accounts', '0001_initial', %s)
            ON CONFLICT DO NOTHING
        """, [timezone.now()])
        print("Recorded accounts migration")
    
    if 'notifications' not in existing_migrations or existing_migrations.get('notifications') != '0001_initial':
        cursor.execute("""
            INSERT INTO django_migrations (app, name, applied)
            VALUES ('notifications', '0001_initial', %s)
            ON CONFLICT DO NOTHING
        """, [timezone.now()])
        print("Recorded notifications migration")

# Add account_id column to transactions table if it doesn't exist
cursor.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'account_id';
""")
has_account_column = cursor.fetchone() is not None

if not has_account_column:
    print("Adding account_id column to transactions table...")
    cursor.execute("""
        ALTER TABLE transactions
        ADD COLUMN account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS transactions_account_id_date_time_idx ON transactions (account_id, date DESC, time DESC);
        CREATE INDEX IF NOT EXISTS transactions_account_id_type_idx ON transactions (account_id, type);
    """)
    connection.commit()
    print("Account column added to transactions table!")
else:
    print("Account column already exists in transactions table.")

connection.commit()
print("\nMigrations applied successfully!")
print("You can now use: python manage.py runserver")


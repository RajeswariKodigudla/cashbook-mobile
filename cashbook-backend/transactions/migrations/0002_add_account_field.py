# Generated manually
# Modified to handle existing account field gracefully
from django.db import migrations, models
import django.db.models.deletion


def add_account_field_if_not_exists(apps, schema_editor):
    """Add account field only if it doesn't exist"""
    db_alias = schema_editor.connection.alias
    
    with schema_editor.connection.cursor() as cursor:
        # Check if account_id column exists
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='transactions' AND column_name='account_id'
        """)
        
        if not cursor.fetchone():
            # Column doesn't exist, add it
            Transaction = apps.get_model('transactions', 'Transaction')
            Account = apps.get_model('accounts', 'Account')
            
            field = models.ForeignKey(
                Account,
                on_delete=models.CASCADE,
                related_name='transactions',
                null=True,
                blank=True,
                db_index=True
            )
            field.set_attributes_from_name('account')
            schema_editor.add_field(Transaction, field)


def remove_account_field_if_exists(apps, schema_editor):
    """Remove account field if it exists"""
    db_alias = schema_editor.connection.alias
    
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='transactions' AND column_name='account_id'
        """)
        
        if cursor.fetchone():
            Transaction = apps.get_model('transactions', 'Transaction')
            field = Transaction._meta.get_field('account')
            schema_editor.remove_field(Transaction, field)


def add_indexes_if_not_exist(apps, schema_editor):
    """Add indexes only if they don't exist"""
    db_alias = schema_editor.connection.alias
    
    with schema_editor.connection.cursor() as cursor:
        index_names = [
            'transaction_account_date_time_idx',
            'txn_acct_date_time_idx',
            'transaction_account_type_idx',
            'txn_acct_type_idx',
        ]
        
        for index_name in index_names:
            cursor.execute("""
                SELECT indexname FROM pg_indexes 
                WHERE tablename = 'transactions' AND indexname = %s
            """, [index_name])
            
            if not cursor.fetchone():
                # Index doesn't exist, but we'll let Django handle it via AddIndex operations
                pass


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_account_field_if_not_exists, remove_account_field_if_exists),
        migrations.RunPython(add_indexes_if_not_exist, migrations.RunPython.noop),
        # These will be handled by migration 0005 which renames them
    ]


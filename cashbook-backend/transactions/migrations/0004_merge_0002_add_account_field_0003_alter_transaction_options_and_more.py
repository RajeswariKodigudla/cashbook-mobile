# Generated manually - Merge migration
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0002_add_account_field'),
        ('transactions', '0003_alter_transaction_options_and_more'),
    ]

    operations = [
        # Merge migration - no operations needed as branches don't conflict
        # Branch 0002_add_account_field: Adds account field and indexes
        # Branch 0003_alter_transaction_options_and_more: Adds UserCustomField and transaction fields
        # These operations don't conflict, so merge is safe
    ]


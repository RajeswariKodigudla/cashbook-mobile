# Generated manually

from django.conf import settings
from django.core import validators
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Account',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(db_index=True, max_length=255, validators=[validators.MinLengthValidator(1)])),
                ('type', models.CharField(choices=[('PERSONAL', 'Personal'), ('SHARED', 'Shared')], default='PERSONAL', max_length=20)),
                ('description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, related_name='owned_accounts', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'accounts',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AccountMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('ACCEPTED', 'Accepted'), ('REJECTED', 'Rejected')], db_index=True, default='PENDING', max_length=20)),
                ('can_add_entry', models.BooleanField(default=True)),
                ('can_edit_own_entry', models.BooleanField(default=True)),
                ('can_edit_all_entries', models.BooleanField(default=False)),
                ('can_delete_entry', models.BooleanField(default=False)),
                ('can_view_reports', models.BooleanField(default=True)),
                ('can_manage_members', models.BooleanField(default=False)),
                ('invited_at', models.DateTimeField(auto_now_add=True)),
                ('accepted_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('account', models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, related_name='members', to='accounts.account')),
                ('invited_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sent_invitations', to=settings.AUTH_USER_MODEL)),
                ('user', models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, related_name='account_memberships', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'account_members',
                'unique_together': {('account', 'user')},
            },
        ),
        migrations.AddIndex(
            model_name='account',
            index=models.Index(fields=['owner', '-created_at'], name='accounts_owner__idx'),
        ),
        migrations.AddIndex(
            model_name='account',
            index=models.Index(fields=['type', '-created_at'], name='accounts_type_c_idx'),
        ),
        migrations.AddIndex(
            model_name='accountmember',
            index=models.Index(fields=['account', 'status'], name='account_me_account_idx'),
        ),
        migrations.AddIndex(
            model_name='accountmember',
            index=models.Index(fields=['user', 'status'], name='account_me_user_id_idx'),
        ),
        migrations.AddIndex(
            model_name='accountmember',
            index=models.Index(fields=['status', '-invited_at'], name='account_me_status__idx'),
        ),
    ]


# Generated manually

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('INVITATION', 'Invitation'), ('INVITATION_ACCEPTED', 'Invitation Accepted'), ('TRANSACTION_ADDED', 'Transaction Added'), ('TRANSACTION_EDITED', 'Transaction Edited'), ('PERMISSION_CHANGED', 'Permission Changed'), ('MEMBER_REMOVED', 'Member Removed'), ('ACCOUNT_CREATED', 'Account Created'), ('ACCOUNT_UPDATED', 'Account Updated')], db_index=True, max_length=50)),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('read', models.BooleanField(db_index=True, default=False)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('data', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('account', models.ForeignKey(blank=True, db_index=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='accounts.account')),
                ('triggered_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='triggered_notifications', to=settings.AUTH_USER_MODEL)),
                ('user', models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'notifications',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', '-created_at'], name='notificatio_user_id_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', 'read', '-created_at'], name='notificatio_user_id_read_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['account', '-created_at'], name='notificatio_account_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['type', '-created_at'], name='notificatio_type_cre_idx'),
        ),
    ]


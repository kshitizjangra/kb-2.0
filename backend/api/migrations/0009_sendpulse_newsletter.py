import uuid

from django.db import migrations, models
import django.db.models.deletion


def require_confirmation(apps, schema_editor):
    # Legacy rows have no recorded newsletter confirmation. Keep the addresses,
    # but do not silently import them as confirmed SendPulse subscribers.
    apps.get_model('api', 'Subscriber').objects.using(schema_editor.connection.alias).update(is_active=False)
    apps.get_model('api', 'NewsletterIssue').objects.using(schema_editor.connection.alias).filter(status='sending').update(
        status='review', last_error='Legacy Resend delivery was in progress. Check its dashboard before creating a replacement issue.',
    )


class Migration(migrations.Migration):
    dependencies = [('api', '0008_leadmagnet')]

    operations = [
        migrations.AlterField(model_name='subscriber', name='is_active', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='subscriber', name='status', field=models.CharField(choices=[('pending', 'Awaiting confirmation'), ('active', 'Confirmed'), ('unsubscribed', 'Unsubscribed'), ('suppressed', 'Delivery blocked')], default='pending', max_length=16)),
        migrations.AddField(model_name='subscriber', name='source', field=models.CharField(default='newsletter', max_length=16)),
        migrations.AddField(model_name='subscriber', name='consent_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='subscriber', name='confirmed_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='subscriber', name='confirmation_requested_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='subscriber', name='provider_status', field=models.IntegerField(blank=True, null=True)),
        migrations.AddField(model_name='subscriber', name='unsubscribe_pending', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='subscriber', name='welcome_status', field=models.CharField(choices=[('pending', 'Awaiting confirmation/setup'), ('submitting', 'Submitting'), ('queued', 'Queued with provider'), ('failed', 'Rejected'), ('review', 'Check SendPulse')], default='pending', max_length=16)),
        migrations.AddField(model_name='subscriber', name='welcome_requested_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='subscriber', name='welcome_provider_id', field=models.CharField(blank=True, max_length=64)),
        migrations.AddField(model_name='subscriber', name='welcome_attempts', field=models.PositiveSmallIntegerField(default=0)),
        migrations.AlterField(model_name='newsletterissue', name='status', field=models.CharField(choices=[('draft', 'Draft'), ('queued', 'Queued'), ('moderation', 'Awaiting moderation'), ('sending', 'Sending'), ('sent', 'Sent'), ('failed', 'Failed'), ('review', 'Check delivery status')], default='draft', max_length=16)),
        migrations.AddField(model_name='newsletterissue', name='provider_campaign_id', field=models.CharField(blank=True, max_length=64)),
        migrations.AddField(model_name='newsletterissue', name='last_error', field=models.TextField(blank=True)),
        migrations.AddField(model_name='newsletterissue', name='delivered_count', field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name='newsletterissue', name='opened_count', field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name='newsletterissue', name='clicked_count', field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name='newsletterissue', name='bounced_count', field=models.PositiveIntegerField(default=0)),
        migrations.CreateModel(name='NewsletterSendAttempt', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('key', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
            ('is_test', models.BooleanField(default=False)),
            ('status', models.CharField(choices=[('creating', 'Submitting'), ('accepted', 'Accepted'), ('unknown', 'Outcome unknown'), ('failed', 'Rejected')], default='creating', max_length=16)),
            ('provider_campaign_id', models.CharField(blank=True, max_length=64)),
            ('reserved_count', models.PositiveIntegerField(default=0)),
            ('last_error', models.TextField(blank=True)),
            ('created_at', models.DateTimeField(auto_now_add=True)),
            ('issue', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='send_attempts', to='api.newsletterissue')),
        ], options={'ordering': ['-created_at']}),
        migrations.RunPython(require_confirmation, migrations.RunPython.noop),
    ]

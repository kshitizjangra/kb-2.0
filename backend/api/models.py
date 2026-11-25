import uuid

from django.conf import settings
from django.db import models
from tinymce.models import HTMLField


class Email(models.Model):
    email = models.EmailField(max_length=254, unique=True)
    ip = models.TextField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'emails'
        ordering = ['-created_at']

    def __str__(self):
        return self.email


class Feedback(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField(max_length=254)
    message = models.TextField(max_length=2000)
    ip = models.TextField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'feedback'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} <{self.email}>'


class Subscriber(models.Model):
    email = models.EmailField(max_length=254, unique=True)
    name = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=False)
    status = models.CharField(max_length=16, default='pending', choices=[
        ('pending', 'Awaiting confirmation'), ('active', 'Confirmed'),
        ('unsubscribed', 'Unsubscribed'), ('suppressed', 'Delivery blocked'),
    ])
    source = models.CharField(max_length=16, default='newsletter')
    consent_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    confirmation_requested_at = models.DateTimeField(null=True, blank=True)
    provider_status = models.IntegerField(null=True, blank=True)
    unsubscribe_pending = models.BooleanField(default=False)
    welcome_status = models.CharField(max_length=16, default='pending', choices=[
        ('pending', 'Awaiting confirmation/setup'), ('submitting', 'Submitting'),
        ('queued', 'Queued with provider'), ('failed', 'Rejected'), ('review', 'Check SendPulse'),
    ])
    welcome_requested_at = models.DateTimeField(null=True, blank=True)
    welcome_provider_id = models.CharField(max_length=64, blank=True)
    welcome_attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'newsletter_subscribers'
        ordering = ['-created_at']

    def __str__(self):
        return self.email


class NewsletterIssue(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('queued', 'Queued'),
        ('moderation', 'Awaiting moderation'),
        ('sending', 'Sending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('review', 'Check delivery status'),
    ]
    subject = models.CharField(max_length=300)
    body_html = HTMLField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='draft')
    recipient_count = models.IntegerField(default=0)
    provider_campaign_id = models.CharField(max_length=64, blank=True)
    last_error = models.TextField(blank=True)
    delivered_count = models.PositiveIntegerField(default=0)
    opened_count = models.PositiveIntegerField(default=0)
    clicked_count = models.PositiveIntegerField(default=0)
    bounced_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'newsletter_issues'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.subject} [{self.status}]'

    def save(self, *args, **kwargs):
        import bleach

        self.body_html = bleach.clean(
            self.body_html or '',
            tags=settings.BLEACH_ALLOWED_TAGS,
            attributes=settings.BLEACH_ALLOWED_ATTRS,
            protocols=['http', 'https', 'mailto'],
            strip=True,
        )
        super().save(*args, **kwargs)


class NewsletterSendAttempt(models.Model):
    """Durable campaign identity, including requests with an uncertain outcome."""

    key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    issue = models.ForeignKey(NewsletterIssue, on_delete=models.SET_NULL, null=True, related_name='send_attempts')
    is_test = models.BooleanField(default=False)
    status = models.CharField(max_length=16, default='creating', choices=[
        ('creating', 'Submitting'), ('accepted', 'Accepted'),
        ('unknown', 'Outcome unknown'), ('failed', 'Rejected'),
    ])
    provider_campaign_id = models.CharField(max_length=64, blank=True)
    reserved_count = models.PositiveIntegerField(default=0)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def campaign_name(self):
        return f'kamna-{self.key.hex}'


class Testimonial(models.Model):
    """Topmate review shown on the site. Kamna manages these from admin."""

    name = models.CharField(max_length=120)
    date_label = models.CharField(
        max_length=20, blank=True, help_text="e.g. Sep 2026"
    )
    text = models.TextField(max_length=2000)
    rating = models.PositiveSmallIntegerField(default=5)
    is_visible = models.BooleanField(default=True)
    sort_order = models.IntegerField(
        default=0, help_text="Lower shows first"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'testimonials'
        ordering = ['sort_order', '-id']

    def __str__(self):
        return f'{self.name} ({self.date_label})'


class SiteSetting(models.Model):
    """Editable site-wide values (Topmate counts). Key-value store."""

    key = models.CharField(max_length=100, unique=True)
    value = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'site_settings'

    def __str__(self):
        return f'{self.key}={self.value}'


class BlogPost(models.Model):
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=320, unique=True)
    excerpt = models.TextField(blank=True)
    body_html = HTMLField()
    cover_image = models.CharField(max_length=500, blank=True)
    medium_url = models.URLField(max_length=500, blank=True)
    author_name = models.CharField(max_length=120, default='Kamna Bhardwaj')
    author_photo = models.CharField(
        max_length=500, default='/blog/author-kamna.jpg'
    )
    published_at = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'blog_posts'
        ordering = ['-published_at', '-id']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        import bleach

        self.body_html = bleach.clean(
            self.body_html or '',
            tags=settings.BLEACH_ALLOWED_TAGS,
            attributes=settings.BLEACH_ALLOWED_ATTRS,
            protocols=['http', 'https', 'mailto'],
            strip=True,
        )
        super().save(*args, **kwargs)


SUPPORTED_LANGS = ('en', 'hi', 'ta', 'te', 'mr', 'kn', 'or')


class BlogPostTranslation(models.Model):
    post = models.ForeignKey(
        BlogPost, on_delete=models.CASCADE, related_name='translations'
    )
    lang = models.CharField(max_length=8)
    title = models.CharField(max_length=300)
    excerpt = models.TextField(blank=True)
    body_html = HTMLField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'blog_post_translations'
        ordering = ['lang']
        constraints = [
            models.UniqueConstraint(
                fields=['post', 'lang'], name='unique_post_lang'
            )
        ]

    def __str__(self):
        return f'{self.post.slug} [{self.lang}]'

    def save(self, *args, **kwargs):
        import bleach

        self.body_html = bleach.clean(
            self.body_html or '',
            tags=settings.BLEACH_ALLOWED_TAGS,
            attributes=settings.BLEACH_ALLOWED_ATTRS,
            protocols=['http', 'https', 'mailto'],
            strip=True,
        )
        super().save(*args, **kwargs)


class LeadMagnet(models.Model):
    """Email-gated PDF stored in Postgres.

    Vercel serverless has a read-only, ephemeral filesystem, so the PDF cannot
    live on disk. One row (key='default') holds the bytes; the bundled
    backend/assets file is only a local-dev fallback.
    """

    KEY_DEFAULT = 'default'

    key = models.CharField(max_length=40, unique=True, default=KEY_DEFAULT)
    filename = models.CharField(max_length=255, default='lead-magnet.pdf')
    data = models.BinaryField()
    size = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lead_magnet_files'

    def __str__(self):
        return f'{self.key}: {self.filename} ({self.size} B)'

    @property
    def content(self) -> bytes:
        return bytes(self.data)

    def save(self, *args, **kwargs):
        if self.data is not None:
            self.data = bytes(self.data)
            self.size = len(self.data)
        super().save(*args, **kwargs)


class LinkedInPost(models.Model):
    urn = models.CharField(max_length=120, unique=True)
    position = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'linkedin_posts'
        ordering = ['position', 'id']

    def __str__(self):
        return self.urn


class InstagramReel(models.Model):
    url = models.URLField(max_length=500)
    code = models.CharField(max_length=120, unique=True)
    position = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'instagram_reels'
        ordering = ['position', 'id']

    def __str__(self):
        return self.code


class ChatThread(models.Model):
    """Visitor chat thread. Token stored in visitor localStorage."""

    token = models.CharField(max_length=64, unique=True)
    label = models.CharField(max_length=120, blank=True)
    has_unread = models.BooleanField(default=False)
    ip = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chat_threads'
        ordering = ['-updated_at']

    def __str__(self):
        return self.label or self.token[:8]


class ChatMessage(models.Model):
    SENDER_CHOICES = [
        ('visitor', 'Visitor'),
        ('bot', 'Bot'),
        ('kamna', 'Kamna'),
    ]
    thread = models.ForeignKey(
        ChatThread, on_delete=models.CASCADE, related_name='messages'
    )
    sender = models.CharField(max_length=10, choices=SENDER_CHOICES)
    text = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_messages'
        ordering = ['id']

    def __str__(self):
        return f'{self.sender}: {self.text[:40]}'

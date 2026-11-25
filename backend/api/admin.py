from django.contrib import admin

from .models import (
    BlogPost,
    BlogPostTranslation,
    ChatMessage,
    ChatThread,
    Email,
    Feedback,
    InstagramReel,
    LeadMagnet,
    LinkedInPost,
    NewsletterIssue,
    SiteSetting,
    Subscriber,
    Testimonial,
)

admin.site.site_header = 'Helluu Kamna'
admin.site.site_title = 'Helluu Kamna'
admin.site.index_title = 'Helluu Kamna'


@admin.register(Email)
class EmailAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'ip', 'created_at')
    search_fields = ('email', 'ip')
    ordering = ('-created_at',)


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_published', 'published_at')
    list_filter = ('is_published',)
    search_fields = ('title', 'excerpt')
    prepopulated_fields = {'slug': ('title',)}
    ordering = ('-published_at',)


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'created_at')
    search_fields = ('name', 'email', 'message')
    ordering = ('-created_at',)


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ('name', 'date_label', 'rating', 'is_visible', 'sort_order')
    list_filter = ('is_visible',)
    search_fields = ('name', 'text')
    ordering = ('sort_order', '-id')


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'value', 'updated_at')
    search_fields = ('key',)


@admin.register(Subscriber)
class SubscriberAdmin(admin.ModelAdmin):
    list_display = ('email', 'name', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('email', 'name')
    ordering = ('-created_at',)


@admin.register(NewsletterIssue)
class NewsletterIssueAdmin(admin.ModelAdmin):
    list_display = ('subject', 'status', 'recipient_count', 'sent_at')
    list_filter = ('status',)
    search_fields = ('subject',)
    ordering = ('-created_at',)


@admin.register(BlogPostTranslation)
class BlogPostTranslationAdmin(admin.ModelAdmin):
    list_display = ('post', 'lang', 'title', 'updated_at')
    list_filter = ('lang',)
    search_fields = ('title', 'post__slug')
    ordering = ('post', 'lang')


@admin.register(LinkedInPost)
class LinkedInPostAdmin(admin.ModelAdmin):
    list_display = ('urn', 'position', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('urn',)
    ordering = ('position', 'id')


@admin.register(InstagramReel)
class InstagramReelAdmin(admin.ModelAdmin):
    list_display = ('code', 'position', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('code', 'url')
    ordering = ('position', 'id')


@admin.register(ChatThread)
class ChatThreadAdmin(admin.ModelAdmin):
    list_display = ('label', 'token', 'has_unread', 'updated_at')
    list_filter = ('has_unread',)
    search_fields = ('token', 'label')
    ordering = ('-updated_at',)


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('thread', 'sender', 'created_at')
    list_filter = ('sender',)
    search_fields = ('text',)
    ordering = ('-id',)


@admin.register(LeadMagnet)
class LeadMagnetAdmin(admin.ModelAdmin):
    list_display = ('key', 'filename', 'size', 'updated_at')
    search_fields = ('key', 'filename')
    exclude = ('data',)
    readonly_fields = ('key', 'filename', 'size', 'updated_at')

    def has_add_permission(self, request):
        # PDF bytes come from the Files panel upload, never hand-typed here.
        return False

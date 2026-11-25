from django.urls import path

from . import cron, views

urlpatterns = [
    path('api/csrf', views.csrf_token),
    path('api/cron/run-tasks', cron.run_tasks),
    path('api/tasks/run', cron.run_task),
    path('api/email', views.submit_email),
    path('api/download', views.download),
    path('api/admin/login', views.admin_login),
    path('api/admin/logout', views.admin_logout),
    path('api/admin/emails', views.admin_emails),
    path('api/admin/feedback', views.admin_feedback),
    path('api/admin/feedback/<int:pk>', views.admin_feedback_delete),
    path('api/admin/blog', views.admin_blog_list),
    path('api/admin/blog/create', views.admin_blog_create),
    path('api/admin/blog/cover/upload', views.admin_blog_cover_upload),
    path('api/admin/blog/<slug:slug>', views.admin_blog_update),
    path('api/admin/blog/<slug:slug>/delete', views.admin_blog_delete),
    path('api/admin/lead-magnet', views.admin_lead_magnet),
    path('api/admin/lead-magnet/upload', views.admin_lead_magnet_upload),
    path('api/admin/newsletter/subscribers', views.admin_subscribers),
    path('api/admin/newsletter/status', views.admin_newsletter_status),
    path('api/admin/newsletter/sync', views.admin_newsletter_sync),
    path(
        'api/admin/newsletter/subscribers/<int:pk>',
        views.admin_subscriber_delete,
    ),
    path('api/admin/newsletter/issues', views.admin_issues),
    path('api/admin/newsletter/issues/create', views.admin_issue_create),
    path('api/admin/newsletter/issues/<int:pk>', views.admin_issue_detail),
    path(
        'api/admin/newsletter/issues/<int:pk>/edit', views.admin_issue_update
    ),
    path(
        'api/admin/newsletter/issues/<int:pk>/delete',
        views.admin_issue_delete,
    ),
    path(
        'api/admin/newsletter/issues/<int:pk>/send', views.admin_issue_send
    ),
    path(
        'api/admin/newsletter/issues/<int:pk>/test', views.admin_issue_test
    ),
    path('api/newsletter/subscribe', views.subscribe_newsletter),
    path('api/newsletter/unsubscribe', views.unsubscribe_newsletter),
    path('api/blog', views.blog_list),
    path('api/blog/<slug:slug>', views.blog_detail),
    path('api/chat/thread', views.chat_thread_create),
    path('api/chat/message', views.chat_message_send),
    path('api/chat/messages', views.chat_thread_messages),
    path('api/admin/chat', views.admin_chat_threads),
    path('api/admin/chat/<str:token>', views.admin_chat_detail),
    path('api/admin/chat/<str:token>/reply', views.admin_chat_reply),
    path(
        'api/admin/chat/<str:token>/delete',
        views.admin_chat_delete,
    ),
    path('api/feedback', views.submit_feedback),
    path(
        'api/admin/blog/<slug:slug>/translations',
        views.admin_blog_translations,
    ),
    path(
        'api/admin/blog/<slug:slug>/translations/save',
        views.admin_blog_translation_upsert,
    ),
    path(
        'api/admin/blog/<slug:slug>/translations/<str:lang>',
        views.admin_blog_translation_delete,
    ),
    path('api/social/linkedin', views.social_linkedin),
    path('api/social/instagram', views.social_instagram),
    path('api/admin/social', views.admin_social),
    path('api/admin/social/linkedin', views.admin_linkedin_create),
    path('api/admin/social/linkedin/<int:pk>', views.admin_linkedin_update),
    path(
        'api/admin/social/linkedin/<int:pk>/delete',
        views.admin_linkedin_delete,
    ),
    path('api/admin/social/instagram', views.admin_reel_create),
    path('api/admin/social/instagram/<int:pk>', views.admin_reel_update),
    path(
        'api/admin/social/instagram/<int:pk>/delete',
        views.admin_reel_delete,
    ),
    path('api/testimonials', views.testimonials_public),
    path('api/admin/testimonials', views.admin_testimonials),
    path('api/admin/testimonials/create', views.admin_testimonial_create),
    path(
        'api/admin/testimonials/<int:pk>', views.admin_testimonial_update
    ),
    path(
        'api/admin/testimonials/<int:pk>/delete',
        views.admin_testimonial_delete,
    ),
    path('api/admin/site-settings', views.admin_site_settings),
]

import json
from unittest.mock import Mock, patch

from django.core.cache import cache
from django.test import RequestFactory, TestCase, override_settings

from . import public_cache
from .models import BlogPost, BlogPostTranslation, LinkedInPost
from .views import blog_detail, blog_list, social_linkedin


@override_settings(REDIS_URL='')
class PublicContentCacheTests(TestCase):
    def setUp(self):
        cache.clear()
        public_cache._retry_after = 0
        self.factory = RequestFactory()
        self.post = BlogPost.objects.create(title='A lesson', slug='a-lesson', body_html='<p>Story</p>')
        self.linkedin = LinkedInPost.objects.create(urn='urn:li:activity:123')

    def list(self, lang='en'):
        return blog_list(self.factory.get('/api/blog', {'lang': lang}))

    def test_english_miss_is_one_query_and_hit_is_zero(self):
        with self.assertNumQueries(1):
            first = self.list()
        self.assertEqual(first['X-Public-Cache'], 'MISS')
        with self.assertNumQueries(0):
            second = self.list()
        self.assertEqual(second['X-Public-Cache'], 'HIT')
        self.assertEqual(first.content, second.content)

    def test_translation_prefetch_does_not_issue_one_query_per_post(self):
        for index in range(6):
            post = BlogPost.objects.create(title=f'Post {index}', slug=f'post-{index}', body_html='Story')
            BlogPostTranslation.objects.create(post=post, lang='hi', title=f'लेख {index}', body_html='कहानी')
        with self.assertNumQueries(2):
            result = self.list('hi')
        self.assertEqual(len(json.loads(result.content)['posts']), 7)

    def test_languages_are_isolated_and_fallback_is_english(self):
        BlogPostTranslation.objects.create(post=self.post, lang='hi', title='सीख', body_html='कहानी')
        english = json.loads(self.list().content)['posts'][0]
        hindi = json.loads(self.list('hi').content)['posts'][0]
        tamil = json.loads(self.list('ta').content)['posts'][0]
        self.assertEqual(english['title'], 'A lesson')
        self.assertEqual(hindi['title'], 'सीख')
        self.assertEqual(tamil['lang'], 'en')

    def test_post_edit_invalidates_list_and_detail_after_commit(self):
        self.list()
        blog_detail(self.factory.get('/api/blog/a-lesson'), 'a-lesson')
        with self.captureOnCommitCallbacks(execute=True):
            self.post.title = 'Updated'
            self.post.save()
        result = self.list()
        self.assertEqual(result['X-Public-Cache'], 'MISS')
        self.assertEqual(json.loads(result.content)['posts'][0]['title'], 'Updated')
        detail = blog_detail(self.factory.get('/api/blog/a-lesson'), 'a-lesson')
        self.assertEqual(json.loads(detail.content)['post']['title'], 'Updated')

    def test_unpublish_removes_cached_article(self):
        self.list()
        blog_detail(self.factory.get('/api/blog/a-lesson'), 'a-lesson')
        with self.captureOnCommitCallbacks(execute=True):
            self.post.is_published = False
            self.post.save()
        self.assertEqual(json.loads(self.list().content)['posts'], [])
        result = blog_detail(self.factory.get('/api/blog/a-lesson'), 'a-lesson')
        self.assertEqual(result.status_code, 404)
        self.assertEqual(result['Cache-Control'], 'no-store')

    def test_missing_article_is_not_cached(self):
        request = self.factory.get('/api/blog/new')
        self.assertEqual(blog_detail(request, 'new').status_code, 404)
        BlogPost.objects.create(title='New', slug='new', body_html='Story')
        self.assertEqual(blog_detail(request, 'new').status_code, 200)

    def test_translation_change_invalidates_language_cache(self):
        self.list('hi')
        with self.captureOnCommitCallbacks(execute=True):
            BlogPostTranslation.objects.create(post=self.post, lang='hi', title='नई सीख', body_html='कहानी')
        self.assertEqual(json.loads(self.list('hi').content)['posts'][0]['title'], 'नई सीख')

    def test_linkedin_cache_invalidates_when_hidden_or_deleted(self):
        request = self.factory.get('/api/social/linkedin')
        social_linkedin(request)
        with self.assertNumQueries(0):
            self.assertEqual(social_linkedin(request)['X-Public-Cache'], 'HIT')
        with self.captureOnCommitCallbacks(execute=True):
            self.linkedin.is_active = False
            self.linkedin.save()
        self.assertEqual(json.loads(social_linkedin(request).content)['posts'], [])

    def test_public_responses_have_only_short_public_cache_headers(self):
        result = self.list()
        self.assertEqual(result['Cache-Control'], 'public, max-age=30')
        self.assertIn('s-maxage=60', result['Vercel-CDN-Cache-Control'])
        self.assertFalse(result.cookies)

    @override_settings(REDIS_URL='redis://test.invalid:6379')
    @patch('api.public_cache._store')
    def test_redis_outage_falls_back_without_breaking_page(self, store):
        broken = Mock()
        broken.get.side_effect = TimeoutError('unavailable')
        store.return_value = (broken, True)
        with self.assertNumQueries(1):
            self.assertEqual(self.list().status_code, 200)
        with self.assertNumQueries(1):
            self.assertEqual(self.list().status_code, 200)
        broken.get.assert_called_once()  # circuit breaker avoids repeated timeouts

    def test_expired_generation_never_reuses_old_content(self):
        self.list()
        cache.delete('kamna:public:v1:blog:generation')
        BlogPost.objects.filter(pk=self.post.pk).update(title='Fresh after TTL')
        result = self.list()
        self.assertEqual(result['X-Public-Cache'], 'MISS')
        self.assertEqual(json.loads(result.content)['posts'][0]['title'], 'Fresh after TTL')

    def test_admin_endpoints_do_not_receive_public_cache_headers(self):
        session = self.client.session
        session['admin'] = True
        session.save()
        response = self.client.get('/api/admin/blog')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('Vercel-CDN-Cache-Control', response)
        self.assertNotIn('X-Public-Cache', response)

    @override_settings(KV_REST_API_URL='https://kv.example', KV_REST_API_TOKEN='token')
    @patch('api.public_cache.requests.post')
    def test_vercel_kv_rest_cache_is_used_when_available(self, post):
        post.side_effect = [
            Mock(ok=True, json=lambda: {'result': None}),
            Mock(ok=True, json=lambda: {'result': 'OK'}),
            Mock(ok=True, json=lambda: {'result': 'generation-1'}),
            Mock(ok=True, json=lambda: {'result': None}),
            Mock(ok=True, json=lambda: {'result': 'OK'}),
        ]
        result = self.list()
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result['X-Public-Cache'], 'MISS')
        self.assertTrue(any(call.kwargs['json'][0] == 'SET' for call in post.call_args_list))

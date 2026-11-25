from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        from .public_cache import register_invalidation
        register_invalidation()

"""DB routing: reads → `readonly` alias (least-privilege role) when configured.

Both aliases point at the SAME physical Postgres — only the role privileges
differ, so there is no replication lag or cross-database staleness.
Without DATABASE_READONLY_URL nothing changes (single `default` alias).
"""
from django.conf import settings


class ReadOnlyRouter:
    def _readonly(self) -> bool:
        return 'readonly' in getattr(settings, 'DATABASES', {})

    def db_for_read(self, model, **hints):
        return 'readonly' if self._readonly() else None

    def db_for_write(self, model, **hints):
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        if not self._readonly():
            return None
        # Same physical database — relations are always valid.
        return obj1._state.db in (None, 'default', 'readonly') and (
            obj2._state.db in (None, 'default', 'readonly')
        )

    def allow_migrate(self, db_alias, app_label, model_name=None, **hints):
        # Schema changes only ever run on the read-write alias.
        return db_alias == 'default'

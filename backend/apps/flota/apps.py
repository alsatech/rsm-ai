from django.apps import AppConfig


class FlotaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.flota'
    verbose_name = 'Flota'

    def ready(self):
        from . import signals  # noqa: F401

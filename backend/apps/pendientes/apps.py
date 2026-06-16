from django.apps import AppConfig


class PendientesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.pendientes'
    verbose_name = 'Pendientes'

    def ready(self):
        import apps.pendientes.signals  # noqa: F401

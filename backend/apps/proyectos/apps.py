from django.apps import AppConfig


class ProyectosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.proyectos'
    verbose_name = 'Proyectos'

    def ready(self):
        from . import signals  # noqa: F401

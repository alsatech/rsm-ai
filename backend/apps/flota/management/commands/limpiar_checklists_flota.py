"""Borra todos los checklists de flota — útil para limpiar el ambiente de pruebas.

Elimina los registros de ChecklistVehiculo (y sus AdvertenciaChecklist en cascada).
Opcionalmente también borra los archivos de FotoChecklist en MEDIA_ROOT.

Uso:
    python manage.py limpiar_checklists_flota
    python manage.py limpiar_checklists_flota --borrar-fotos
    python manage.py limpiar_checklists_flota --confirmar    # no pregunta
"""

import os

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.flota.models import ChecklistVehiculo, FotoChecklist


class Command(BaseCommand):
    help = 'Borra todos los checklists de flota y, opcionalmente, sus fotos en disco.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--borrar-fotos',
            action='store_true',
            help='También borra los archivos físicos de las fotos en MEDIA_ROOT.',
        )
        parser.add_argument(
            '--confirmar',
            action='store_true',
            help='No pide confirmación antes de borrar.',
        )

    def handle(self, *args, **options):
        total_checklists = ChecklistVehiculo.objects.count()
        total_fotos = FotoChecklist.objects.count()
        total_advertencias = sum(c.advertencias.count() for c in ChecklistVehiculo.objects.all())

        self.stdout.write(self.style.WARNING(
            f'Se encontraron {total_checklists} checklists, '
            f'{total_fotos} fotos en BD y {total_advertencias} advertencias.'
        ))

        if total_checklists == 0:
            self.stdout.write('Nada que borrar.')
            return

        if not options['confirmar']:
            resp = input('¿Borrar todo? (sí/no): ').strip().lower()
            if resp not in ('sí', 'si', 's', 'yes', 'y'):
                self.stdout.write('Cancelado.')
                return

        # Borrar archivos físicos primero (si se pidió), luego los registros.
        archivos_borrados = 0
        archivos_fallidos = 0
        if options['borrar_fotos']:
            media_root = settings.MEDIA_ROOT
            for foto in FotoChecklist.objects.all():
                ruta = os.path.join(media_root, foto.foto.name)
                try:
                    if os.path.isfile(ruta):
                        os.remove(ruta)
                        archivos_borrados += 1
                except OSError as exc:
                    archivos_fallidos += 1
                    self.stdout.write(self.style.ERROR(
                        f'No se pudo borrar {ruta}: {exc}'
                    ))

        # Borrar registros — el modelo tiene on_delete=CASCADE en AdvertenciaChecklist.
        checklists_eliminados, _ = ChecklistVehiculo.objects.all().delete()

        self.stdout.write(self.style.SUCCESS(
            f'✔ {checklists_eliminados} registros eliminados '
            f'(checklists + fotos en BD + advertencias en cascada).'
        ))
        if options['borrar_fotos']:
            self.stdout.write(self.style.SUCCESS(
                f'✔ {archivos_borrados} archivos de fotos borrados en disco, '
                f'{archivos_fallidos} fallidos.'
            ))
        elif total_fotos > 0:
            self.stdout.write(self.style.NOTICE(
                f'ℹ {total_fotos} archivos de fotos quedaron en disco '
                f'(usa --borrar-fotos para limpiarlos).'
            ))

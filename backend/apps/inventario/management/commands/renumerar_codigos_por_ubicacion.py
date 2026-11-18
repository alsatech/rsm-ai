"""Renumera los códigos de producto con una serie por ubicación (AL-001, HNG-001…).

Comando MANUAL (no migración) a propósito: el inventario de la VPS es distinto al local y no
debe renumerarse solo al desplegar. Conserva el orden relativo de los códigos actuales dentro
de cada ubicación. Con --eliminar-bodega borra la ubicación 'bodega' y sus productos.

    python manage.py renumerar_codigos_por_ubicacion --eliminar-bodega            # dry-run
    python manage.py renumerar_codigos_por_ubicacion --eliminar-bodega --aplicar  # ejecuta
"""
import json
import re
from collections import defaultdict

from django.core.management.base import BaseCommand, CommandError
from django.core.serializers import serialize
from django.db import transaction

from apps.inventario.models import GrupoMaterial, MovimientoInventario, Producto, Ubicacion


def clave_orden(codigo):
    numeros = re.findall(r'\d+', codigo)
    return (int(numeros[-1]) if numeros else 0, codigo)


class Command(BaseCommand):
    help = 'Renumera códigos de producto por ubicación (prefijo + 3 dígitos).'

    def add_arguments(self, parser):
        parser.add_argument('--aplicar', action='store_true', help='Ejecuta el cambio (sin esto solo es dry-run).')
        parser.add_argument('--eliminar-bodega', action='store_true', help="Elimina la ubicación 'bodega' y sus productos.")
        parser.add_argument('--respaldo', default='respaldo_codigos_inventario.json', help='Archivo JSON de respaldo.')

    def handle(self, *args, **opts):
        bodega = Ubicacion.objects.filter(nombre='bodega').first() if opts['eliminar_bodega'] else None
        productos = Producto.objects.select_related('ubicacion').exclude(ubicacion=bodega) if bodega else \
            Producto.objects.select_related('ubicacion')

        sin_prefijo = {p.ubicacion.nombre for p in productos if not p.ubicacion.prefijo}
        if sin_prefijo:
            raise CommandError(f'Ubicaciones sin prefijo definido: {sorted(sin_prefijo)}')

        por_ubicacion = defaultdict(list)
        for p in productos:
            por_ubicacion[p.ubicacion].append(p)

        mapeo = []
        for ubicacion, lista in por_ubicacion.items():
            lista.sort(key=lambda p: clave_orden(p.codigo))
            for n, p in enumerate(lista, start=1):
                mapeo.append((p, f'{ubicacion.prefijo}-{n:03d}'))

        if bodega:
            prods_bodega = Producto.objects.filter(ubicacion=bodega)
            self.stdout.write(f'Bodega: se eliminarán {prods_bodega.count()} productos, '
                              f'{MovimientoInventario.objects.filter(producto__in=prods_bodega).count()} movimientos, '
                              f'{GrupoMaterial.objects.filter(ubicacion=bodega).count()} grupos.')
        for ubicacion, lista in sorted(por_ubicacion.items(), key=lambda x: x[0].nombre):
            self.stdout.write(f'{ubicacion.nombre}: {len(lista)} productos → {ubicacion.prefijo}-001 … {ubicacion.prefijo}-{len(lista):03d}')
        for p, nuevo in mapeo[:8]:
            self.stdout.write(f'  ej: {p.codigo} → {nuevo}')

        if not opts['aplicar']:
            self.stdout.write(self.style.WARNING('Dry-run: no se cambió nada. Usa --aplicar para ejecutar.'))
            return

        # Respaldo previo (productos, movimientos de los afectados, grupos, ubicaciones).
        afectados = Producto.objects.all()
        with open(opts['respaldo'], 'w', encoding='utf-8') as f:
            json.dump({
                'ubicaciones': json.loads(serialize('json', Ubicacion.objects.all())),
                'productos': json.loads(serialize('json', afectados)),
                'grupos': json.loads(serialize('json', GrupoMaterial.objects.all())),
                'movimientos': json.loads(serialize('json', MovimientoInventario.objects.all())),
            }, f, ensure_ascii=False)
        self.stdout.write(f'Respaldo guardado en {opts["respaldo"]}')

        with transaction.atomic():
            if bodega:
                prods_bodega = Producto.objects.filter(ubicacion=bodega)
                MovimientoInventario.objects.filter(producto__in=prods_bodega).delete()
                prods_bodega.delete()
                GrupoMaterial.objects.filter(ubicacion=bodega).delete()
                bodega.delete()
            # Dos fases para no chocar con la restricción de unicidad.
            for p, _ in mapeo:
                Producto.objects.filter(pk=p.pk).update(codigo=f'TMP-{p.pk}')
            for p, nuevo in mapeo:
                Producto.objects.filter(pk=p.pk).update(codigo=nuevo)
        self.stdout.write(self.style.SUCCESS(f'Listo: {len(mapeo)} productos renumerados.'))

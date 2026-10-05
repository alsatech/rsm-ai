from django.core.files.base import ContentFile

from .models import Factura


def archivo_nombre(campo_archivo):
    return campo_archivo.name.rsplit('/', 1)[-1]


def crear_factura_desde_compra(compra, registrado_por):
    """Convierte una Compra de Inventario en una Factura de Facturación. Idempotente por
    referencia_id: si la compra ya se importó (manual o automáticamente al enviar una
    Relación de Compras) devuelve la Factura existente en vez de duplicarla."""
    existente = Factura.objects.filter(
        modulo_origen=Factura.ModuloOrigen.INVENTARIO, referencia_id=compra.id,
    ).first()
    if existente:
        return existente, False

    factura = Factura(
        numero_factura=f'INV-{compra.id}',
        fecha=compra.fecha_compra,
        concepto=compra.proveedor or f'Compra de inventario #{compra.id}',
        importe=compra.monto_total,
        modulo_origen=Factura.ModuloOrigen.INVENTARIO,
        referencia_id=compra.id,
        referencia_descripcion=f'Compra de inventario #{compra.id}',
        notas=compra.notas,
        registrado_por=registrado_por,
    )
    if compra.foto_factura:
        factura.archivo.save(
            archivo_nombre(compra.foto_factura), ContentFile(compra.foto_factura.read()), save=False,
        )
    factura.save()
    return factura, True

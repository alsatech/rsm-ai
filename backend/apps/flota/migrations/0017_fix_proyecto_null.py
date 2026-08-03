# Hecho a mano: SQLite no aplica `ALTER COLUMN ... DROP NOT NULL`. Recreamos la
# tabla `flota_checklistvehiculo` con la columna `proyecto` permitiendo NULL.
# La migración 0016 quedó registrada como aplicada pero la BD física no se actualizó.

from django.db import migrations, models


SQLITE_SCHEMA = """
CREATE TABLE "flota_checklistvehiculo_new" (
    "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo_reporte" varchar(10) NOT NULL,
    "fecha_hora" datetime NOT NULL,
    "km_reporte" decimal NULL,
    "nivel_combustible" integer NULL,
    "observaciones" text NOT NULL,
    "validado" bool NOT NULL,
    "validado_en" datetime NULL,
    "created_at" datetime NOT NULL,
    "responsable_id" bigint NOT NULL REFERENCES "users_user" ("id") DEFERRABLE INITIALLY DEFERRED,
    "validado_por_id" bigint NULL REFERENCES "users_user" ("id") DEFERRABLE INITIALLY DEFERRED,
    "vehiculo_id" bigint NOT NULL REFERENCES "flota_vehiculo" ("id") DEFERRABLE INITIALLY DEFERRED,
    "anticongelante" bool NOT NULL,
    "lavado" bool NOT NULL,
    "soplado_filtro_aire" bool NOT NULL,
    "carga_traila" bool NOT NULL,
    "estado_fisico" bool NOT NULL,
    "nivel_aceite_motor" bool NOT NULL,
    "nivel_aceite_transmision" bool NOT NULL,
    "traila_id" bigint NULL REFERENCES "flota_vehiculo" ("id") DEFERRABLE INITIALLY DEFERRED,
    "limpieza" bool NOT NULL,
    "sin_carga" bool NOT NULL,
    "sin_herramientas" bool NOT NULL,
    "incidencia_previa" text NOT NULL,
    "incidencia_nueva" text NOT NULL,
    "proyecto" varchar(200) NULL,
    "salida_relacionada_id" bigint NULL REFERENCES "flota_checklistvehiculo" ("id") DEFERRABLE INITIALLY DEFERRED
)
"""


def drop_notnull_proyecto(apps, schema_editor):
    """SQLite: reconstruir la tabla para permitir NULL en `proyecto`."""
    if schema_editor.connection.vendor != 'sqlite':
        # En PostgreSQL/MySQL basta con AlterField; Django ya lo maneja.
        return

    with schema_editor.connection.cursor() as cursor:
        # 1. Crear tabla nueva con el schema actualizado
        cursor.execute(SQLITE_SCHEMA)
        # 2. Copiar datos (proyecto actual = '' → permitimos NULL para filas vacías)
        cursor.execute(
            """
            INSERT INTO flota_checklistvehiculo_new
            SELECT id, tipo_reporte, fecha_hora, km_reporte, nivel_combustible,
                   observaciones, validado, validado_en, created_at,
                   responsable_id, validado_por_id, vehiculo_id, anticongelante,
                   lavado, soplado_filtro_aire, carga_traila, estado_fisico,
                   nivel_aceite_motor, nivel_aceite_transmision, traila_id,
                   limpieza, sin_carga, sin_herramientas, incidencia_previa,
                   incidencia_nueva,
                   CASE WHEN proyecto = '' THEN NULL ELSE proyecto END,
                   salida_relacionada_id
            FROM flota_checklistvehiculo
            """
        )
        # 3. Borrar tabla vieja
        cursor.execute("DROP TABLE flota_checklistvehiculo")
        # 4. Renombrar nueva
        cursor.execute("ALTER TABLE flota_checklistvehiculo_new RENAME TO flota_checklistvehiculo")
        # 5. Recrear índices
        cursor.execute(
            "CREATE INDEX flota_checklistvehiculo_responsable_id_88e34646 "
            "ON flota_checklistvehiculo (responsable_id)"
        )
        cursor.execute(
            "CREATE INDEX flota_checklistvehiculo_validado_por_id_61246f98 "
            "ON flota_checklistvehiculo (validado_por_id)"
        )
        cursor.execute(
            "CREATE INDEX flota_checklistvehiculo_vehiculo_id_11372858 "
            "ON flota_checklistvehiculo (vehiculo_id)"
        )
        cursor.execute(
            "CREATE INDEX flota_checklistvehiculo_traila_id_a00b9c0a "
            "ON flota_checklistvehiculo (traila_id)"
        )
        cursor.execute(
            "CREATE INDEX flota_checklistvehiculo_salida_relacionada_id_98703f60 "
            "ON flota_checklistvehiculo (salida_relacionada_id)"
        )
        cursor.execute(
            "CREATE UNIQUE INDEX uniq_llegada_por_salida "
            "ON flota_checklistvehiculo (salida_relacionada_id) "
            "WHERE salida_relacionada_id IS NOT NULL"
        )


class Migration(migrations.Migration):

    dependencies = [
        ('flota', '0016_checklist_proyecto_null'),
    ]

    operations = [
        migrations.RunPython(drop_notnull_proyecto, migrations.RunPython.noop),
    ]
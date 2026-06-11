# AGENTS.md — RSM Sistema
> Instrucciones específicas para agentes de Claude Code.
> Leer CLAUDE.md primero, luego este archivo antes de cualquier tarea.

---

## Regla general antes de cualquier sesión

1. Leer `CLAUDE.md` completo
2. Leer `PROGRESS.md` para saber en qué módulo estamos
3. Identificar el módulo a construir
4. Leer la sección correspondiente en este archivo
5. Ejecutar — no improvisar estructura ni nombres

---

## Sesión de trabajo — template estándar

Usar este formato al iniciar cada sesión con Claude Code:

```
Lee CLAUDE.md y PROGRESS.md.
Módulo a construir: [NOMBRE DEL MÓDULO]
Rol owner: [ROL]
Tarea: [descripción específica]
Restricciones: no modificar módulos ya completados.
Al terminar: actualizar PROGRESS.md y CHANGELOG.md, commit con formato [MÓDULO] feat: descripción, push a main.
```

---

## Instrucciones por capa técnica

### Django — Backend

**Estructura obligatoria por app:**
```
apps/nombre_modulo/
├── models.py        ← modelos con timestamps: created_at, updated_at
├── serializers.py   ← nunca responder JSON crudo desde views
├── views.py         ← usar APIView o ViewSet, nunca función suelta
├── urls.py          ← prefijo: /api/v1/nombre-modulo/
├── permissions.py   ← permisos custom por rol si aplica
├── tasks.py         ← tareas Celery si el módulo tiene alertas
└── tests.py         ← mínimo: test_model + test_endpoint
```

**Permisos — siempre verificar rol antes de cualquier operación:**
```python
# Roles disponibles en el sistema:
# 'campo' | 'inventario' | 'operaciones' | 'administrador' | 'superadmin'

# Nunca usar IsAdminUser de Django — usar permisos custom del proyecto
# Ejemplo:
class EsSuperadmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.perfil.rol == 'superadmin'
```

**Modelos — reglas:**
- Todo modelo lleva `created_at` y `updated_at` con `auto_now`
- Todo modelo lleva `created_by` ForeignKey a User
- Usar `choices` para campos de estado — nunca strings libres
- Nombres de modelos en singular, tablas en plural (Django default)

**Endpoints — estructura:**
```
GET    /api/v1/modulo/          ← lista (filtrada por rol)
POST   /api/v1/modulo/          ← crear
GET    /api/v1/modulo/{id}/     ← detalle
PUT    /api/v1/modulo/{id}/     ← actualizar completo
PATCH  /api/v1/modulo/{id}/     ← actualizar parcial
DELETE /api/v1/modulo/{id}/     ← solo superadmin puede borrar
```

**Variables de entorno — nunca hardcodear:**
```python
# Siempre desde settings usando python-decouple o django-environ
SECRET_KEY = config('SECRET_KEY')
DATABASE_URL = config('DATABASE_URL')
REDIS_URL = config('REDIS_URL')
```

---

### React — Frontend

**Estructura de carpetas por módulo:**
```
src/
├── pages/
│   └── NombreModulo/
│       ├── index.jsx         ← página principal
│       ├── components/       ← componentes locales del módulo
│       └── hooks/            ← hooks locales si aplica
├── components/               ← componentes globales reutilizables
├── api/
│   └── nombreModulo.js       ← todas las llamadas Axios del módulo
└── hooks/
    └── useAuth.js            ← hook de autenticación global
```

**Reglas de componentes:**
- Verificar rol del usuario antes de renderizar cualquier elemento sensible
- Elementos sin acceso = no renderizar (`return null`), nunca `disabled` ni candado
- Siempre manejar estados: loading, error, empty, data
- Formularios: validación en frontend Y backend, nunca solo uno

**Paleta y estilos — obligatorio:**
```
Fondo principal:  #0a0f0d
Acento verde:     #1f6b3e
Highlight:        #4ade80
Fondo cards:      #0d1a11
Bordes:           #1f6b3e33
Texto principal:  #e8f5ee
Texto secundario: #6b8f77
Error:            #f87171
Warning:          #fbbf24
Fuente:           DM Sans (body), Space Mono (datos/código)
```

**Llamadas a API — siempre con Axios:**
```javascript
// src/api/nombreModulo.js
import api from './axios' // instancia base con interceptors de JWT

export const getNombreModulo = () => api.get('/api/v1/nombre-modulo/')
export const createNombreModulo = (data) => api.post('/api/v1/nombre-modulo/', data)
```

**Toast de feedback — siempre al guardar:**
```
✅ éxito  →  verde  →  3 segundos
⚠️ alerta →  amarillo → 4 segundos
🔴 error  →  rojo   →  5 segundos, con mensaje del backend
```

---

## Instrucciones por módulo

### Módulo 1 — Login y roles
- JWT con access token (15 min) y refresh token (7 días)
- Al hacer login retornar: token + datos del usuario + rol
- Guardar token en `localStorage` con key `rsm_token`
- Guardar perfil en `localStorage` con key `rsm_user`
- Redirigir al dashboard según rol después del login
- Si token expirado: refresh automático, si falla → logout

### Módulo 2 — Hidráulica y pluviómetros
- Solo rol `campo` puede crear registros
- Rol `administrador` y `superadmin` pueden ver todos los registros
- Abigail (`administrador`) valida los registros — agregar campo `validado_por`
- Campos obligatorios: punto_medicion, estado (normal/alerta/falla), fecha_hora
- Campos opcionales: nivel_pulgadas, caudal_m3h, presion_psi, observaciones, foto
- Alertas Celery: si estado = `falla`, notificar a Alberto y Abigail inmediatamente

### Módulo 3 — Pendientes rastreables
- Solo `administrador` y `superadmin` pueden crear y cerrar pendientes
- Campo asignado_a acepta cualquier usuario del sistema
- Estados: pendiente → en_proceso → listo
- Color en UI: pendiente=rojo, en_proceso=amarillo, listo=verde
- La minuta automática consumirá este módulo — respetar estructura

### Módulo 4 — Ganado — recorridos
- Rol `campo` crea recorridos, `administrador`/`superadmin` ven todos
- Puntos del recorrido se agregan manualmente sobre mapa Leaflet
- Guardar array de coordenadas `[{lat, lng, orden}]` en campo JSONField
- Google Maps API key va en `.env` como `GOOGLE_MAPS_API_KEY`
- Sin mínimo de puntos para guardar — el vaquero puede registrar solo el punto de llegada

### Módulo 5 — Flota vehicular
- `Campo` crea checklist de salida/llegada
- `Administrador` (Abigail) valida y agrega observaciones
- `Operaciones` (Erik) supervisa estado general de la flota
- Alertas Celery: cambio de aceite cada 5,000 km, calibración llantas cada 3 meses
- Campos de kilometraje: guardar como Integer, calcular diferencia automáticamente

### Módulo 6 — Inventarios
- Owner exclusivo: rol `inventario` (Yajaira)
- `Superadmin` tiene lectura total
- Movimientos: entrada / salida / ajuste — nunca borrar, solo registrar movimiento
- Campo `auditado` boolean para que Yajaira marque registros verificados
- Alertas: cuando stock llegue a `stock_minimo` notificar a Yajaira y Alberto

### Módulo 7 — Registro de ganado por arete
- Catálogo base: arete SINIIGA, sexo, color, fecha_ingreso, observaciones
- Este módulo es la FK base para Módulo 8 (Sanidad)
- `Campo` puede registrar animales, `administrador`/`superadmin` pueden editar

### Módulo 8 — Sanidad animal
- Requiere Módulo 7 completado (FK a animal por arete)
- Tipos de evento: vacunacion / desparasitacion / tratamiento / pesaje / revision
- Alertas Celery: próxima vacuna según calendario registrado
- Médico responsable: campo libre (Dr. Campa u otros)

### Módulo 9 — Personal
- Owner exclusivo: rol `administrador` (Alexia) y `superadmin` (Alberto)
- Préstamos: monto_total, monto_descuento_quincenal, saldo_pendiente (calculado)
- Nómina: registro quincenal, no cálculo automático — Alexia ingresa los montos
- Nunca mostrar datos de nómina a roles `campo`, `inventario` ni `operaciones`

### Módulo 10 — Minuta automática
- Solo `superadmin` puede generar (Alberto, Minerva)
- Consumir datos del día de: Hidráulica, Pendientes, Ganado, Flota
- Formato de salida: texto estructurado exportable
- Botón "Copiar al portapapeles" + botón "Descargar .txt"
- Si no hay registros del día en algún módulo, sección aparece como "Sin reportes"

### Módulo 11 — Facturación
- Owners: `administrador` (Alexia) y `operaciones` (Erik para facturas de compras)
- Tipos: factura_emitida / factura_recibida / comprobante_gasto
- Campos obligatorios: fecha, monto, concepto, proveedor_o_cliente, archivo (PDF/imagen)
- Concentrado mensual: vista filtrada por mes para enviar a contadora

### Módulo 12 — Proyectos
- Owner exclusivo: rol `operaciones` (Erik Yepez)
- `Superadmin` tiene lectura y puede comentar
- Un proyecto tiene: nombre, descripcion, estatus, presupuesto, fecha_inicio, fecha_estimada_fin
- Sub-recursos del proyecto: materiales, compras, contratistas, proveedores, avances
- Notificaciones: tenencia y predial van como tarea Celery con fecha de vencimiento

---

## Alertas y notificaciones — Celery

Todas las alertas del sistema usan Celery + Redis. Nunca inline en views.

```python
# Patrón estándar para cualquier alerta:
from celery import shared_task

@shared_task
def alerta_mantenimiento_vehiculo(vehiculo_id, tipo_alerta):
    # 1. Buscar usuarios con rol que debe recibir la alerta
    # 2. Crear registro en modelo Notificacion
    # 3. En el futuro: enviar WhatsApp/email (fuera del SLA actual)
    pass
```

Alertas definidas en el SLA:
- Falla hidráulica → Alberto + Abigail (inmediata)
- Mantenimiento vehículo → Abigail + Erik (programada)
- Stock mínimo inventario → Yajaira + Alberto (diaria 5 PM)
- Próxima vacuna ganado → Abigail + Alberto (7 días antes)
- Tenencia / predial → Alberto + Erik (30 días antes)

---

## Al finalizar cada módulo — checklist obligatorio

Antes de hacer el push, verificar:

- [ ] Modelo con `created_at`, `updated_at`, `created_by`
- [ ] Serializer creado (no JSON crudo)
- [ ] Permisos por rol implementados y probados
- [ ] Al menos un test de modelo y uno de endpoint
- [ ] Elementos UI ocultos para roles sin acceso (no deshabilitados)
- [ ] Textos en español mexicano
- [ ] Dark theme aplicado con la paleta correcta
- [ ] `PROGRESS.md` actualizado con la entrada del push
- [ ] `CHANGELOG.md` actualizado con la versión
- [ ] Commit con formato `[MÓDULO] feat: descripción`

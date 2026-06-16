# CHANGELOG.md — RSM Sistema
> Historial de cambios por versión. Formato: [MÓDULO] vX.X — descripción.

---

## Unreleased

### En desarrollo
- Módulo 3 — Pendientes rastreables

---

## Versiones

_Se registran aquí al completar cada módulo._

---

### v0.1.0 — Login y roles
- Setup del proyecto Django (`config`) + app `apps/users`
- Modelo `User` extendido con campo `rol` (campo/inventario/operaciones/administrador/superadmin)
- Autenticación JWT (djangorestframework-simplejwt): `POST /api/v1/auth/login/`, `POST /api/v1/auth/refresh/`, `GET /api/v1/auth/me/`
- Login regresa `access`, `refresh`, `nombre` y `rol`
- Permisos custom por rol en `apps/users/permissions.py`
- Tests de modelo y de endpoints de autenticación
- Frontend React + Vite + Tailwind con dark theme RSM (paleta y fuentes definidas en AGENTS.md)
- Pantalla de Login, hook `useAuth` con refresh automático y logout si falla
- Dashboard con los 12 módulos como cards, visibles según rol (elementos sin acceso completamente ocultos)

### v0.2.0 — Hidráulica y pluviómetros
- App `apps/hidraulica`: modelo `RegistroHidraulico` con 10 puntos de medición (pilas, fluxómetros, manómetros, pluviómetros), estados `normal`/`alerta`/`falla`, lecturas (nivel, caudal, presión, lluvia), foto, observaciones y validación (`validado`, `validado_por`)
- Endpoints `GET/POST /api/v1/hidraulica/` y `GET/PATCH /api/v1/hidraulica/{id}/` con permisos por rol y filtros (fecha, punto, estado, usuario)
- `campo` crea y solo ve sus propios registros; `administrador`/`superadmin` ven todos y validan
- Tarea Celery `alerta_falla_hidraulica`: notifica (consola) a superadmins/administradores cuando un registro entra en estado `falla`
- Configuración base de Celery + Redis (`config/celery.py`, `CELERY_TASK_ALWAYS_EAGER` en dev) y soporte de `MEDIA_URL`/`MEDIA_ROOT` (Pillow) para fotos
- Tests de modelo y endpoints (permisos, filtros, validación, alerta)
- Frontend: página `/hidraulica` con formulario mobile-first (dropdown de punto, toggle de estado, campos condicionales para pluviómetros, foto opcional) y tabla de registros del día con botón "Validar" para `administrador`/`superadmin`
- Ruta protegida por rol (`ProtectedRoute` con prop `roles`) y enlace desde el Dashboard

### v0.2.1 — Generadores: checklist diario y alertas de mantenimiento (ajuste Módulo 2)
- Modelos `Generador` (Chapote, Rancho, Margaritas — horas de operación), `ChecklistGenerador` (revisión diaria: aceite, refrigerante, filtro de aire, fugas) y `AlertaMantenimientoGenerador` (intervalos de servicio en horas/meses)
- Data migration precarga los 3 generadores con sus intervalos de mantenimiento reales (Wacker Neuson G25, Cummins 225, Detroit Diesel 3-71)
- Endpoints: `GET /api/v1/hidraulica/generadores/`, `PATCH /api/v1/hidraulica/generadores/{id}/` (horas, solo `administrador`/`superadmin`), `GET/POST /api/v1/hidraulica/generadores/{id}/checklist/`
- `campo` registra la revisión diaria y ve su propio historial; `administrador`/`superadmin` ven el historial completo y las alertas de mantenimiento pendientes
- Tarea Celery `revisar_alertas_generadores` (diaria, 6:00 am vía `CELERY_BEAT_SCHEDULE`): compara horas de operación contra los intervalos y notifica (consola) el servicio requerido
- Tests de modelo y endpoints (checklist completo/incompleto, alerta por horas, permisos de actualización de horas)
- Frontend: sección "Generadores" en `/hidraulica` con tarjetas por generador (horas actuales, botón "Hacer revisión diaria", checklist con 4 verificaciones + observaciones, historial del día), campo de actualización de horas para `administrador`/`superadmin` y alertas de mantenimiento destacadas en amarillo

### v0.3.0 — Pendientes rastreables
- App `apps/pendientes`: modelos `Pendiente` (estados, prioridades, motivos de bloqueo, asignación M2M, módulo relacionado, fecha límite/cierre, cerrado_por), `HistorialPendiente` y `FotoPendiente` (máx. 4 fotos con momentos apertura/seguimiento/cierre)
- Señales Django: historial automático al cambiar estado, fecha_cierre auto en cierre, validación de bloqueo sin motivo → HTTP 400
- Custom exception handler (`config/exceptions.py`) que convierte `django.core.exceptions.ValidationError` a respuestas DRF 400
- Endpoints: `GET/POST /api/v1/pendientes/`, `GET/PATCH /api/v1/pendientes/{id}/`, historial, cambiar-estado, resumen, fotos (subir y eliminar)
- `GET /api/v1/auth/usuarios/` agregado en `apps/users` para el multiselect de asignación
- Permisos: `campo` ve solo sus pendientes asignados y solo puede cambiar a en_proceso/bloqueado; `administrador`/`superadmin` tienen acceso completo incluyendo cierre y eliminación de fotos
- Frontend: página `/pendientes` con vista lista (admin) y vista tarjetas (campo), formulario paso a paso en 3 etapas, vista detalle con timeline de historial y galería de fotos con lightbox, widget `ResumenPendientes` para el dashboard
- Ruta `/pendientes` registrada en `App.jsx` y `modules.js` actualizado con `ruta` y acceso a campo

### v0.4.0 — Ganado — recorridos GPS
> Pendiente

### v0.5.0 — Flota vehicular
> Pendiente

### v0.6.0 — Inventarios
> Pendiente

### v0.7.0 — Registro de ganado por arete
> Pendiente

### v0.8.0 — Sanidad animal
> Pendiente

### v0.9.0 — Personal
> Pendiente

### v1.0.0 — Minuta automática
> Pendiente

### v1.1.0 — Facturación
> Pendiente

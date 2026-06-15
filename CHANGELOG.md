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

### v0.3.0 — Pendientes rastreables
> Pendiente

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

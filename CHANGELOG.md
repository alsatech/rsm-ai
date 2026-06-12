# CHANGELOG.md — RSM Sistema
> Historial de cambios por versión. Formato: [MÓDULO] vX.X — descripción.

---

## Unreleased

### En desarrollo
- Módulo 2 — Hidráulica y pluviómetros

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
> Pendiente

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

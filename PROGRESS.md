# PROGRESS.md — RSM Sistema
> Bitácora de avance del proyecto. Actualizar en cada push de módulo.

---

## Estado general

**Inicio del proyecto:** Por definir (fecha de firma del SLA)  
**Fecha límite (día 90):** Por definir  
**Módulos completados:** 1 / 11  
**Fase actual:** Mes 1

---

## Checklist de módulos

### Fase 1 — Mes 1 (Días 1–30)
- [x] **Módulo 1** — Login y roles
- [ ] **Módulo 2** — Hidráulica y pluviómetros
- [ ] **Módulo 3** — Pendientes rastreables

### Fase 2 — Mes 2 (Días 31–60)
- [ ] **Módulo 4** — Ganado — recorridos GPS
- [ ] **Módulo 5** — Flota vehicular
- [ ] **Módulo 6** — Inventarios
- [ ] **Módulo 7** — Registro de ganado por arete

### Fase 3 — Mes 3 (Días 61–90)
- [ ] **Módulo 8** — Sanidad animal
- [ ] **Módulo 9** — Personal
- [ ] **Módulo 10** — Minuta automática
- [ ] **Módulo 11** — Facturación

---

## Bitácora de pushes

> Cada entrada se agrega al completar y hacer push de un módulo.

---

### 🟢 Push #1
**Módulo:** Módulo 1 — Login y roles  
**Fecha:** 2026-06-12  
**Branch:** main  
**Commit:** `[LOGIN] feat: setup proyecto Django+React y autenticación JWT con 5 roles`  
**Descripción:** Setup completo del proyecto. Backend Django + DRF + SimpleJWT con app `apps/users` (modelo User con campo `rol`, endpoints `/api/v1/auth/login|refresh|me`, permisos custom por rol). Frontend React + Vite + Tailwind con dark theme RSM, pantalla de Login, hook `useAuth` con refresh automático y logout en caso de fallo, y Dashboard con los 12 módulos como cards filtrados por rol.  
**Notas:** Usuarios de prueba creados en local (uno por rol) con contraseña `rsm12345` para validar el flujo de login/dashboard.

---

_Los pushes se registran aquí cronológicamente conforme se completan los módulos._

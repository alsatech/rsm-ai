# PROGRESS.md — RSM Sistema
> Bitácora de avance del proyecto. Actualizar en cada push de módulo.

---

## Estado general

**Inicio del proyecto:** Por definir (fecha de firma del SLA)  
**Fecha límite (día 90):** Por definir  
**Módulos completados:** 2 / 11  
**Fase actual:** Mes 1

---

## Checklist de módulos

### Fase 1 — Mes 1 (Días 1–30)
- [x] **Módulo 1** — Login y roles
- [x] **Módulo 2** — Hidráulica y pluviómetros
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

### 🟢 Push #2
**Módulo:** Módulo 2 — Hidráulica y pluviómetros  
**Fecha:** 2026-06-15  
**Branch:** main  
**Commit:** `[HIDRÁULICA] feat: captura de parámetros hidráulicos y pluviómetros`  
**Descripción:** App `apps/hidraulica` con modelo `RegistroHidraulico` (10 puntos de medición, estados normal/alerta/falla, lecturas de nivel/caudal/presión/lluvia, foto, validación). Endpoints `GET/POST /api/v1/hidraulica/` y `GET/PATCH /api/v1/hidraulica/{id}/` con permisos por rol: `campo` crea y solo ve sus propios registros, `administrador`/`superadmin` ven todos y validan. Filtros por fecha, punto, estado y usuario. Tarea Celery `alerta_falla_hidraulica` notifica (consola) a Alberto/Minerva/Alexia/Abigail cuando un registro entra en estado `falla`. Se agregó configuración base de Celery + Redis (`config/celery.py`, `CELERY_TASK_ALWAYS_EAGER` en dev) y soporte de `MEDIA_URL`/`MEDIA_ROOT` para fotos (Pillow). Frontend: página `/hidraulica` mobile-first con formulario (dropdown de punto, toggle de estado, campos condicionales según punto pluviométrico, foto opcional) y tabla de registros del día con botón "Validar" para `administrador`/`superadmin`. Ruta protegida por rol y enlazada desde el Dashboard.  
**Notas:** 17/17 tests backend OK. Verificado con llamadas reales a la API (login, crear, listar filtrado por rol, validar, alerta de falla en consola) y `npm run build` sin errores. No fue posible tomar screenshots de navegador en este entorno (faltan librerías del sistema para Chromium headless y no hay sudo).

---

### 🟢 Push #3
**Módulo:** Ajuste Módulo 2 — Generadores (checklist diario y alertas de mantenimiento)  
**Fecha:** 2026-06-15  
**Branch:** main  
**Commit:** `[HIDRÁULICA] feat: generadores con checklist diario y alertas de mantenimiento`  
**Descripción:** Se agregan a `apps/hidraulica` los modelos `Generador` (Chapote/Rancho/Margaritas con horas de operación), `ChecklistGenerador` (revisión diaria: nivel de aceite, refrigerante, filtro de aire, fugas, observaciones) y `AlertaMantenimientoGenerador` (intervalos de servicio en horas/meses). Data migration precarga los 3 generadores reales (Wacker Neuson G25 20kW, Cummins 225 20kW, Detroit Diesel 3-71 20kW) con sus intervalos de mantenimiento documentados. Endpoints: `GET /api/v1/hidraulica/generadores/` (lista con horas y alertas pendientes), `PATCH /api/v1/hidraulica/generadores/{id}/` (actualizar horas, solo `administrador`/`superadmin`), `GET/POST /api/v1/hidraulica/generadores/{id}/checklist/` (checklist diario — `campo` crea y ve su propio historial, `administrador`/`superadmin` ven todo). Tarea Celery `revisar_alertas_generadores` corre diariamente (6:00 am vía `CELERY_BEAT_SCHEDULE`), compara `horas_operacion` contra cada `horas_intervalo` activo y, si se alcanzó, imprime en consola el servicio requerido (evita repetir el mismo día). Frontend: nueva sección "Generadores" dentro de `/hidraulica` con una tarjeta por generador (horas actuales, alertas de mantenimiento en amarillo para `administrador`/`superadmin`, campo de horas editable para esos roles, botón "Hacer revisión diaria" que despliega el checklist de 4 verificaciones + observaciones y el historial de revisiones del día).  
**Notas:** 25/25 tests backend OK (8 nuevos: checklist completo/incompleto, alerta por horas, permisos de horas, historial filtrado por rol, fixture de generadores). Verificado con llamadas reales a la API (POST checklist como `chino`, PATCH horas bloqueado para `campo` y permitido para `abigail`, alerta de mantenimiento de Chapote a las 250h disparada y sin duplicarse en una segunda corrida) y `npm run build`/`npm run lint` sin errores. No fue posible tomar screenshots de navegador en este entorno (faltan librerías del sistema para Chromium headless y no hay sudo).

---

_Los pushes se registran aquí cronológicamente conforme se completan los módulos._

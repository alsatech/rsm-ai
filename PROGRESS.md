# PROGRESS.md — RSM Sistema
> Bitácora de avance del proyecto. Actualizar en cada push de módulo.

---

## Estado general

**Inicio del proyecto:** Por definir (fecha de firma del SLA)  
**Fecha límite (día 90):** Por definir  
**Módulos completados:** 4 / 11  
**Fase actual:** Mes 1

---

## Checklist de módulos

### Fase 1 — Mes 1 (Días 1–30)
- [x] **Módulo 1** — Login y roles
- [x] **Módulo 2** — Hidráulica y pluviómetros
- [x] **Módulo 3** — Pendientes rastreables

### Fase 2 — Mes 2 (Días 31–60)
- [x] **Módulo 4** — Ganado — recorridos GPS
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

### 🟢 Push #4
**Módulo:** Módulo 3 — Pendientes rastreables  
**Fecha:** 2026-06-16  
**Branch:** main  
**Commit:** `[PENDIENTES] feat: sistema de pendientes rastreables con historial y bloqueos`  
**Descripción:** App `apps/pendientes` con modelos `Pendiente` (estados abierto/en_proceso/bloqueado/cerrado, prioridades, motivos de bloqueo, asignación ManyToMany, módulo relacionado, fecha límite, fecha de cierre, cerrado_por), `HistorialPendiente` (trazabilidad de cada cambio de estado con nota y usuario), y `FotoPendiente` (máximo 4 fotos por pendiente en momentos apertura/seguimiento/cierre). Señales Django que registran historial automáticamente al cambiar estado, establecen fecha_cierre al cerrar, y validan que el bloqueo siempre tenga motivo. Endpoints: `GET/POST /api/v1/pendientes/`, `GET/PATCH /api/v1/pendientes/{id}/`, `GET /api/v1/pendientes/{id}/historial/`, `POST /api/v1/pendientes/{id}/cambiar-estado/`, `GET /api/v1/pendientes/resumen/`, `POST /api/v1/pendientes/{id}/fotos/`, `DELETE /api/v1/pendientes/{id}/fotos/{foto_id}/`. Permisos estrictos: `campo` solo ve sus pendientes asignados y solo puede cambiar a en_proceso/bloqueado; `administrador`/`superadmin` tienen acceso completo. Endpoint `GET /api/v1/auth/usuarios/` agregado para el multiselect de asignación. Custom exception handler para convertir `django.core.exceptions.ValidationError` a respuestas HTTP 400 en la API. Frontend: página `/pendientes` con vista lista para admin/superadmin (tabs por estado con conteo, cards clickeables con badges de estado/prioridad, bloqueados destacados en naranja, botón fijo "Nuevo pendiente"), vista tarjetas para campo (cards grandes mobile-first con estado legible, empty state amigable), formulario de 3 pasos (título/descripción/prioridad → asignado_a/origen → módulo/fecha_límite), vista detalle con timeline de historial, componente para cambiar estado con motivos de bloqueo, galería de fotos con lightbox y contador 3/4. Widget `ResumenPendientes` exportable para el dashboard.  
**Notas:** 13 nuevos tests backend (todos OK) — 38/38 totales. `npm run build` y `npm run lint` sin errores. No fue posible tomar screenshots de navegador (faltan librerías Chromium en el entorno).

---

### 🟢 Push #5
**Módulo:** Módulo 4 — Ganado — recorridos GPS  
**Fecha:** 2026-06-26  
**Branch:** main  
**Commit:** `[GANADO] feat: recorridos con catálogo de 27 corraletas reales, mapa Leaflet y narrativa`  
**Descripción:** App `apps/ganado` con modelos `Corraleta` (catálogo fijo de 27 ubicaciones reales con coordenadas GPS), `RecorridoGanado` (fecha, responsable, asistentes M2M, número de cabezas, estado del hato, color para diferenciación visual, narrativa libre), `ParadaRecorrido` (tabla intermedia con campo `orden` para mantener secuencia) y `FotoRecorrido` (máx. 4 por recorrido). Data migration precarga las 27 corraletas reales del rancho. Permisos: `campo` crea y solo ve recorridos donde es responsable o asistente; `administrador`/`superadmin` ven todos y eliminan; catálogo solo editable por admin. Endpoints completos con filtros por fecha, responsable, estado_hato y corraleta, más endpoint `resumen/` con total del mes, último recorrido y alertas. Frontend: wizard mobile-first de 3 pasos (info del recorrido con selector de estado por 3 botones grandes + 6 colores; mapa Leaflet con 27 marcadores interactivos + polyline en color del recorrido + chips para seleccionar orden de paradas; carga de fotos desde cámara). Historial agrupado por fecha con tarjetas y alerta visual si hay estado crítico/alerta en el día. Vista detalle con mapa en modo lectura, ruta numerada y lightbox de fotos. Widget `ResumenGanado` para dashboard. `react-leaflet@5 + leaflet@1.9` instalados.  
**Notas:** 46/46 tests backend OK (8 nuevos). `npm run build` sin errores. El único error de lint es pre-existente en `VistaListaAdmin.jsx` del Módulo 3 (no modificado).

---

### 🟢 Push #6
**Módulo:** Ajuste Módulo 4 — Ganado: flujo iniciar/agregar paradas con puntos libres  
**Fecha:** 2026-06-27  
**Branch:** main  
**Commit:** `[GANADO] feat: flujo iniciar/agregar paradas con puntos libres fuera del catálogo`  
**Descripción:** Ajuste al Módulo 4 basado en la realidad operativa: los vaqueros no siempre pasan solo por corraletas del catálogo. Se agregan campos `estado` (en_curso/finalizado), `hora_inicio` (auto), `hora_fin` a `RecorridoGanado`. `ParadaRecorrido` ahora acepta `corraleta` (FK nullable) o `nombre_libre` (texto libre) con `lat`/`lng` opcionales. 4 nuevos endpoints: `POST /iniciar/` (crea recorrido en_curso sin narrativa todavía), `POST /{id}/agregar-parada/` (agrega paradas una a una con auto-orden), `DELETE /{id}/paradas/{parada_id}/` (undo), `PATCH /{id}/finalizar/` (cierra el recorrido con estado_hato + narrativa + hora_fin). Frontend reemplaza el wizard de 3 pasos por flujo dinámico: `PantallaIniciar` (fecha, color, asistentes → llama /iniciar/), `PantallaEnCurso` (mapa en vivo, sheet con 2 tabs: catálogo de 27 corraletas o lugar libre con coords opcionales, botón deshacer, botón Finalizar), `PantallaFinalizar` (estado_hato, narrativa, fotos → llama /finalizar/ luego sube fotos). Recorridos en_curso del historial se pueden reanudar tocándolos. `MapaRecorrido` actualizado para diferencias puntos libres (círculo con borde punteado) vs corraletas del catálogo.  
**Notas:** 14/14 tests backend OK (5 nuevos). `npm run build` sin errores. Sin errores de lint nuevos.

---

_Los pushes se registran aquí cronológicamente conforme se completan los módulos._

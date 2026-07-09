# PROGRESS.md — RSM Sistema
> Bitácora de avance del proyecto. Actualizar en cada push de módulo.

---

## Estado general

**Inicio del proyecto:** Por definir (fecha de firma del SLA)  
**Fecha límite (día 90):** Por definir  
**Módulos completados:** 5 / 11  
**Fase actual:** Mes 2

---

## Checklist de módulos

### Fase 1 — Mes 1 (Días 1–30)
- [x] **Módulo 1** — Login y roles
- [x] **Módulo 2** — Hidráulica y pluviómetros
- [x] **Módulo 3** — Pendientes rastreables

### Fase 2 — Mes 2 (Días 31–60)
- [x] **Módulo 4** — Ganado — recorridos GPS
- [x] **Módulo 5** — Flota vehicular
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

### 🟢 Push #7
**Módulo:** Ajuste Módulo 4 — Ganado: flujo offline con puntos de control, sync automático y heatmap de pastoreo  
**Fecha:** 2026-06-30  
**Branch:** main  
**Commit:** `[GANADO] feat: flujo offline con puntos de control, sync automático y heatmap de pastoreo`  
**Descripción:** Realidad operativa: el vaquero suele perder señal a mitad del recorrido. El flujo ahora es 100% local mientras dura el recorrido — `localStorage` (`src/api/ganadoOffline.js`) es la fuente de verdad para `iniciar`/agregar parada/deshacer, y solo se sincroniza con el backend al presionar "Finalizar recorrido" (o automáticamente al recuperar señal, vía hook `useGanadoSync`). `ParadaRecorrido.hora_llegada` pasa de `TimeField` a `DateTimeField` (migración `0004`). Dos endpoints nuevos: `POST /recorridos/{id}/sync-paradas/` (reemplaza todas las paradas en bloque, solo responsable o admin/superadmin) y `GET /api/v1/ganado/heatmap/` (coordenadas de paradas de recorridos finalizados agrupadas en celdas de ~100m con peso de visitas, solo admin/superadmin, filtros de fecha). Frontend: `PantallaIniciar` arranca el recorrido localmente si no hay señal (se crea en el servidor al sincronizar) y muestra banner para continuar un recorrido pendiente; `PantallaEnCurso` reescrita para que agregar/deshacer parada sea instantáneo (sin llamada a API por toque), con indicador de conectividad, grid de chips + buscador para las 27 corraletas, mapa a 1/3 de pantalla, y modal de aviso si se finaliza sin señal. Nueva vista `HeatmapPastoreo.jsx` (sub-vista del módulo, solo admin/superadmin): mapa satelital con capa de calor (`leaflet.heat`), marcadores de corraletas, filtros de periodo, leyenda y exportación de imagen (`html2canvas`).  
**Notas:** 19/19 tests del módulo Ganado OK (5 nuevos), 57/57 tests backend totales OK. Smoke test manual end-to-end contra el servidor real (iniciar → sync-paradas → finalizar → heatmap con filtro de fecha y permisos) confirmó el flujo completo. `npm run build` y `npm run lint` sin errores nuevos (el único error de lint es el preexistente en `VistaListaAdmin.jsx`, no tocado). No fue posible tomar screenshots de navegador en este entorno (sin Chromium headless).

---

### 🟢 Push #8
**Módulo:** Ajuste Módulo 4 — Ganado: vista clasificación de pastoreo y Planned vs Actual  
**Fecha:** 2026-07-05  
**Branch:** main  
**Commit:** `[GANADO] feat: vista clasificación de pastoreo y planned vs actual con comparación visual`  
**Descripción:** Se agregan a `RecorridoGanado` los campos `tipo` (planeado/real, default real) y `plan_referencia` (FK a sí mismo, `related_name='recorridos_reales'`) — migración `0006`. Solo hay un plan por fecha (validado en el endpoint). Nuevos endpoints: `POST /api/v1/ganado/recorridos/crear-plan/` y `PATCH /api/v1/ganado/recorridos/{id}/editar-plan/` (solo `administrador`/`superadmin`; editar se bloquea si el plan ya tiene un recorrido real vinculado), `GET /api/v1/ganado/recorridos/plan-del-dia/?fecha=` (cualquier rol autenticado), `GET /api/v1/ganado/corraletas/clasificacion/` (solo admin; clasifica cada corraleta en alta/media/baja/sin_uso por percentiles 25/75 de visitas históricas, con filtros de fecha). La vinculación plan↔recorrido real es automática: al finalizar un recorrido (o crearlo por el flujo antiguo de una sola llamada) se busca un plan con la misma fecha y se enlaza. `_qs_recorrido_base` y el heatmap ahora excluyen `tipo=planeado` para no contaminar el historial/heatmap con los planes. Frontend: tabs `[Recorridos][Heatmap][Clasificación][Plan vs Real]` en la página principal de Ganado (las dos nuevas solo visibles para `administrador`/`superadmin`; Heatmap y Recorridos sin tocar). `VistaClasificacion.jsx`: mapa satelital con marcadores coloreados por clase, panel con filtros de periodo, leyenda con rangos calculados del propio dataset, lista ordenada y exportación CSV (generada en el cliente). `VistaPlanVsReal.jsx`: selector de fecha, tarjeta para crear/editar el plan del día (grid de chips para elegir corraletas en orden — mismo patrón visual que usa el vaquero en `PantallaEnCurso` — más textarea de instrucciones) y tarjeta de comparación (mapa con ruta planeada en azul punteado vs ruta real en naranja, marcadores con borde rojo para "planeada no visitada" y borde verde para "extra no planeada", barra de cumplimiento).  
**Notas:** 12 tests nuevos (69/69 backend totales OK). Verificado con llamadas reales a la API contra el servidor de desarrollo (crear plan, bloqueo de duplicado por fecha, plan-del-dia, vinculación automática al finalizar un recorrido real, bloqueo de edición tras vincular, clasificación con datos reales) — en el camino se detectó que la migración `0006` no estaba aplicada en la base de datos local (`db.sqlite3`) y se corrigió con `python manage.py migrate`. `npm run build` y `npm run lint` sin errores nuevos. No se instalaron `leaflet-dataclassification` ni `@accessible360/accessible-slick` (mencionados en el prompt original): la clasificación por percentiles ya se calcula en el backend, y el orden de paradas se resuelve con el mismo patrón de "click para agregar en orden" que ya usa el módulo (sin necesidad de drag-and-drop) — evita una dependencia sin uso real. No fue posible tomar screenshots de navegador real (falta `libnspr4`/deps de Chromium headless y no hay sudo en el entorno), pero sí se logró levantar Chromium headless vía Playwright para health-checks de red iniciales antes de encontrarse con esa limitación; la verificación final fue vía llamadas HTTP directas a los endpoints nuevos con usuarios reales, contrastando cada respuesta contra lo que el código frontend espera.

---

### 🟢 Push #9
**Módulo:** Ajuste Módulo 4 — Ganado: capa visual de cercas del rancho  
**Fecha:** 2026-07-07  
**Branch:** main  
**Commit:** `[GANADO] feat: capa visual de cercas del rancho con tooltips de nombre en todos los mapas`  
**Descripción:** Capa de referencia visual (no seleccionable) con las cercas/lindes reales del rancho, para que Alberto y los vaqueros se orienten igual que en Google Earth. `src/constants/cercasRancho.js` guarda las 13 cercas hardcodeadas (2 polígonos, 11 líneas) con sus coordenadas GPS. Componente global reutilizable `src/components/mapa/CapaCercas.jsx` dibuja cada cerca (`Polygon` o `Polyline` según su tipo) en naranja `#FFA500`, con tooltip `sticky` que muestra el nombre al pasar el cursor (estilo definido en `.tooltip-cerca` dentro de `index.css`). Botón de toggle reutilizable `src/components/mapa/BotonToggleCercas.jsx` y hook `src/hooks/useCercasVisibles.js` (persiste la preferencia en `localStorage` bajo `rsm_cercas_visibles`, default visible). Integrado en los 6 mapas del módulo: `MapaRecorrido.jsx` (cubre de una sola vez el detalle de recorrido, la pantalla en curso del vaquero y el selector de paradas del wizard, al ser un componente compartido), `HeatmapPastoreo.jsx`, `VistaClasificacion.jsx`, `MapaComparacionPlanReal.jsx` (usado por Plan vs Real) y `SimulacionRecorrido.jsx`.  
**Notas:** Sin cambios de backend/modelos. `npm run build` y `npm run lint` sin errores nuevos. No fue posible probar visualmente en navegador en este entorno (sin Chromium headless); se verificó compilación, lint y revisión manual de la integración en cada vista.

---

### 🟢 Push #10
**Módulo:** Módulo 5 — Flota vehicular  
**Fecha:** 2026-07-08  
**Branch:** main  
**Commit:** `[FLOTA] feat: módulo completo de flota vehicular con checklist, alertas y validación`  
**Descripción:** App `apps/flota` con modelos `Vehiculo` (tipo, marca/modelo/año, kilometraje, estado, vencimientos de tenencia/placas, foto), `ChecklistVehiculo` (salida/llegada, responsable, km, 17 ítems booleanos de inspección visual/mecánica/accesorios + nivel de combustible, validación), `FotoChecklist` (máx. 6 fotos) y `AlertaFlota` (km_alerta o fecha_alerta, activa/resuelta). Data migration `0002_precarga_vehiculos` carga los 6 vehículos reales (Savana, Blazer, Polaris, Cuatrimoto Roja, Moto Azul, Camión) como placeholder. Señales (`signals.py`): checklist de llegada sube `kilometraje_actual` si el km reportado es mayor; guardar un vehículo crea alertas de vencimiento si tenencia/placas vencen en los próximos 30 días. Tarea Celery `revisar_alertas_flota` (diaria 6 AM): notifica alertas por km/fecha, genera alerta de cambio de aceite cada 5,000 km y de calibración de llantas si pasan 90 días sin checklist. Endpoints: vehículos (CRUD con permisos por rol), checklists (crear/validar), fotos de checklist, alertas (listar/resolver), `resumen/` para dashboard, `vehiculos/{id}/historial/`. Permisos: `campo`/`administrador`/`superadmin` crean checklist; solo `administrador`/`superadmin` validan y gestionan alertas; solo `operaciones`/`superadmin` editan vehículos; solo `superadmin` elimina. Frontend: dashboard `/flota` con grid de tarjetas por vehículo + panel de alertas activas, wizard de checklist de 3 pasos (identificación con selector de vehículo por cards y slider de combustible, inspección con 3 secciones colapsables y contador de ítems, evidencia fotográfica hasta 6 fotos), vista detalle de vehículo (editable, alertas con botón resolver, historial de checklists con detalle y validación), vista de alertas de toda la flota con filtros y badge de urgencia, widget `ResumenFlota` exportable.  
**Notas:** 13 tests nuevos (82/82 backend totales OK). Verificado con llamadas HTTP reales contra el servidor de desarrollo con usuarios de cada rol: creación de checklist salida/llegada (confirmado que el km del vehículo sube y no retrocede), validación por administrador, edición de vehículo por operaciones y bloqueo para campo (403), señal de vencimiento de placas a 30 días generando alerta crítica automáticamente, resolución de alerta, endpoint de resumen y de historial, y ejecución manual de la tarea Celery `revisar_alertas_flota` (disparó correctamente la alerta de cambio de aceite sobre el vehículo con más kilometraje). Datos de prueba limpiados al terminar. `npm run build` y `npm run lint` sin errores nuevos (el único error de lint es el preexistente en `VistaListaAdmin.jsx` del Módulo 3, no tocado). No fue posible tomar screenshots de navegador real en este entorno (sin Chromium headless).

---

### 🟢 Push #11
**Módulo:** Ajuste Módulo 5 — Flota: reemplazo de vehículos placeholder por los 20 vehículos reales  
**Fecha:** 2026-07-09  
**Branch:** main  
**Commit:** `[FLOTA] feat: migración de 20 vehículos reales RSM`  
**Descripción:** Se reciben los datos reales de la flota y se reemplazan los 6 vehículos placeholder de `0002_precarga_vehiculos`. Migración `0003_vehiculo_equipo_tipos_anio_opcional`: agrega el campo `equipo` (nombre oficial del equipo, separado del apodo interno en `nombre`) y amplía `Vehiculo.Tipo` con `polaris`, `can_am`, `remolque`, `traila`, `maquinaria`, `plataforma` y `van`; `anio` pasa a `null=True, blank=True` para los vehículos con año pendiente o N/A (Caterpillar, remolques, plataforma). Data migration `0004_reemplazo_vehiculos_reales`: elimina los 6 placeholders por nombre y carga (`get_or_create` por `equipo`, idempotente) los 20 vehículos reales — cuatrimotos, Polaris/CAN AM, 4 remolques + traila fabricada + remolque de hechizos, plataforma ganadera, maquinaria Caterpillar, y las unidades con placas (Sierra, Blazer, Tacoma, Savana, F250) con su kilometraje real; donde el Excel decía "N/A" o "PDTE" se usó `0.0` en kilometraje. Serializer y admin actualizados para exponer `equipo`. Frontend: `TIPO_ICONOS`/`TIPO_LABELS` (`constants.js`) ampliados con los 7 tipos nuevos y fallback agregado en `DetalleVehiculo.jsx` para que ningún vehículo real quede sin ícono o etiqueta.  
**Notas:** Migración probada con `migrate`/reversa/reaplicar (`0003`→`0004`→`0003`→`0004`) sin errores. Constante `TOTAL_VEHICULOS_PRECARGADOS` del test `VehiculosPrecargadosTest` actualizada de 6 a 20. 13/13 tests de `apps.flota` OK. `npm run build` sin errores. No se tocó el formulario de edición de vehículo (`FormularioVehiculo.jsx`) — sigue sin exponer `equipo` ni permitir año vacío; fuera del alcance pedido, pendiente si se requiere editar esos campos desde la UI.

---

_Los pushes se registran aquí cronológicamente conforme se completan los módulos._

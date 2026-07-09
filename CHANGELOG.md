# CHANGELOG.md — RSM Sistema
> Historial de cambios por versión. Formato: [MÓDULO] vX.X — descripción.

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
- App `apps/ganado`: modelos `Corraleta` (catálogo fijo de 27 ubicaciones reales), `RecorridoGanado` (fecha, responsable, asistentes M2M, cabezas, estado_hato, color, narrativa, observaciones), `ParadaRecorrido` (tabla intermedia con orden) y `FotoRecorrido` (máx. 4 fotos)
- Data migration `0002_precarga_corraletas` carga las 27 corraletas reales de la reserva con coordenadas exactas GPS
- Endpoints: `GET /api/v1/ganado/corraletas/`, `GET/POST /api/v1/ganado/recorridos/`, `GET/PATCH/DELETE /api/v1/ganado/recorridos/{id}/`, `GET /api/v1/ganado/recorridos/resumen/`, fotos (subir y eliminar)
- Permisos: `campo` crea recorridos y solo ve los que es responsable o asistente; `administrador`/`superadmin` ven todos y pueden eliminar; CRUD de corraletas solo para `administrador`/`superadmin`
- Filtros: fecha, fecha_desde/hasta, responsable, estado_hato, corraleta
- 8 tests backend (todos OK): corraletas precargadas, paradas ordenadas, campo ve solo los suyos, admin ve todos, asistente ve el recorrido, mínimo 2 paradas, máximo 4 fotos, creación exitosa
- Frontend: página `/ganado` con wizard mobile-first de 3 pasos: (1) info del recorrido con selector de estado por 3 botones grandes, selector de color como círculos coloreados y multiselect de asistentes; (2) mapa Leaflet + OpenStreetMap con las 27 corraletas como marcadores interactivos, lista de chips para seleccionar paradas en orden y polyline con el color del recorrido; (3) fotos con captura desde cámara y miniaturas
- Vista historial agrupada por fecha con tarjetas que muestran estado, ruta resumida y narrativa
- Vista detalle en modo solo lectura con mapa, ruta numerada, fotos con lightbox
- Alertas visuales en historial cuando hay recorridos con estado alerta/crítico del día
- Widget `ResumenGanado` exportable para el dashboard (último recorrido, total mes, alertas)
- react-leaflet + leaflet instalados como dependencia

### v0.4.1 — Ganado: flujo iniciar/agregar paradas con puntos libres (ajuste Módulo 4)
- Migración `0003_ganado_estado_parada_libre`: `RecorridoGanado` recibe campos `estado` (en_curso/finalizado), `hora_inicio` (auto), `hora_fin` (nullable). `ParadaRecorrido` ahora acepta `corraleta` nullable o `nombre_libre` + `lat`/`lng` opcionales para puntos fuera del catálogo
- 4 nuevos endpoints: `POST /api/v1/ganado/recorridos/iniciar/` (estado en_curso), `POST /recorridos/{id}/agregar-parada/` (auto-orden, corraleta o nombre_libre), `DELETE /recorridos/{id}/paradas/{parada_id}/` (undo), `PATCH /recorridos/{id}/finalizar/` (cierra con estado_hato, narrativa y hora_fin)
- `RecorridoGanadoListCreateView.perform_create` fuerza `estado=finalizado` para el flujo antiguo
- 5 tests nuevos (14 totales): iniciar_crea_en_curso, agregar_parada_con_corraleta, agregar_parada_con_nombre_libre, parada_sin_datos_falla, finalizar_cambia_estado_y_hora_fin
- Frontend: reemplaza el wizard de 3 pasos por flujo `PantallaIniciar → PantallaEnCurso → PantallaFinalizar`; `PantallaEnCurso` tiene mapa en vivo, sheet con 2 tabs (catálogo de corraletas con chips / lugar libre con coords opcionales), botón deshacer (llama DELETE parada) y botón Finalizar
- Recorridos en_curso en el historial se reanudan tocándolos (redirige a PantallaEnCurso con paradas ya cargadas)
- `MapaRecorrido` actualizado: API unificada `paradas=[{orden,tipo,lat,lng,nombre,corraleta_id}]`, puntos libres con coords se renderizan como círculo con borde punteado

### v0.4.2 — Ganado: flujo offline con puntos de control, sync automático y heatmap de pastoreo (ajuste Módulo 4)
- Migración `0004_alter_paradarecorrido_hora_llegada_and_more`: `ParadaRecorrido.hora_llegada` pasa de `TimeField` a `DateTimeField` para guardar fecha + hora exacta del punto de control
- Nuevo endpoint `POST /api/v1/ganado/recorridos/{id}/sync-paradas/`: reemplaza todas las paradas del recorrido con las capturadas offline en una sola llamada; solo el responsable o `administrador`/`superadmin` pueden sincronizar
- Nuevo endpoint `GET /api/v1/ganado/heatmap/`: coordenadas de paradas de recorridos finalizados agrupadas en celdas de ~100m (3 decimales) con `weight` de visitas; solo `administrador`/`superadmin`; filtros `fecha_desde`/`fecha_hasta`
- 5 tests nuevos (19 totales en el módulo): sync reemplaza paradas existentes, sync solo responsable/admin, heatmap agrupa con peso, heatmap filtra por fecha, heatmap requiere admin
- Frontend: `src/api/ganadoOffline.js` — localStorage (`rsm_recorrido_activo`) como fuente de verdad mientras el recorrido está en curso, con caché de corraletas (`rsm_corraletas_cache`) para que el catálogo funcione sin señal
- `PantallaIniciar` ahora inicia el recorrido localmente si no hay señal (recorrido `pendiente_creacion`, se crea en el servidor al sincronizar) y muestra un banner para continuar un recorrido pendiente
- `PantallaEnCurso` reescrita: agregar/deshacer parada es instantáneo y 100% local (sin llamadas al backend por cada toque), indicador de conectividad (📶/📵), grid de chips con buscador para las 27 corraletas, mapa reducido a 1/3 de pantalla. Al presionar "Finalizar recorrido": si hay señal, crea el recorrido (si fue offline) y sincroniza las paradas vía `sync-paradas` antes de pasar al formulario de cierre; si no hay señal, guarda `pendiente_sync` y muestra modal de aviso
- Hook `useGanadoSync` (montado en `Ganado/index.jsx`) escucha el evento `online` del navegador y sincroniza automáticamente el recorrido pendiente en cuanto regresa la señal
- Nueva vista `HeatmapPastoreo.jsx` (sub-vista del módulo, solo `administrador`/`superadmin`): mapa Leaflet a pantalla completa con capa de calor (`leaflet.heat`) sobre fondo satelital Esri, marcadores blancos de las 27 corraletas, filtros de periodo, leyenda y exportación de imagen (`html2canvas`)
- `leaflet.heat` y `html2canvas` instalados como dependencias

### v0.4.3 — Ganado: clasificación de pastoreo y Planned vs Actual (ajuste Módulo 4)
- Migración `0006`: `RecorridoGanado` recibe `tipo` (`planeado`/`real`, default `real`) y `plan_referencia` (FK a sí mismo, `on_delete=SET_NULL`, `related_name='recorridos_reales'`)
- Nuevos endpoints: `POST /api/v1/ganado/recorridos/crear-plan/`, `PATCH /api/v1/ganado/recorridos/{id}/editar-plan/`, `GET /api/v1/ganado/recorridos/plan-del-dia/?fecha=`, `GET /api/v1/ganado/corraletas/clasificacion/`
- Solo un plan por fecha; el plan deja de ser editable en cuanto un recorrido real se vincula a él
- Vinculación automática plan↔recorrido real por fecha coincidente, tanto en el flujo de finalizar como en el flujo antiguo de creación directa
- Clasificación de corraletas por percentiles (25/75, interpolación lineal) de visitas históricas: `alta`/`media`/`baja`/`sin_uso`, con filtros `fecha_desde`/`fecha_hasta`
- `_qs_recorrido_base` y `HeatmapPastoreoView` filtran `tipo=real` para que los planes no aparezcan en historial/heatmap
- 12 tests nuevos (69 totales en el backend)
- Frontend: tabs `[Recorridos][Heatmap][Clasificación][Plan vs Real]` en `/ganado` (las dos nuevas solo para `administrador`/`superadmin`)
- `VistaClasificacion.jsx`: mapa satelital con marcadores por clase, filtros de periodo, leyenda con rangos del dataset, lista ordenada y exportación CSV
- `VistaPlanVsReal.jsx`: crear/editar plan del día (chips de corraletas en orden + instrucciones) y comparación visual plan vs recorrido real (mapa con dos rutas, marcadores con borde rojo/verde para no-visitadas/extra, barra de cumplimiento)
- `SelectorCorraletasOrden.jsx`, `MapaComparacionPlanReal.jsx`, `TabsGanado.jsx` — componentes nuevos del módulo

### v0.4.4 — Ganado: capa visual de cercas del rancho (ajuste Módulo 4)
- `src/constants/cercasRancho.js`: 13 cercas hardcodeadas (2 polígonos, 11 líneas) con coordenadas GPS reales, color `#FFA500`
- `src/components/mapa/CapaCercas.jsx`: componente global reutilizable que dibuja cada cerca como `Polygon` o `Polyline` según su tipo — solo referencia visual, no seleccionable
- Tooltip `sticky` (sigue al cursor) con el nombre de la cerca al pasar el mouse, estilizado vía clase `.tooltip-cerca` en `index.css`
- `src/components/mapa/BotonToggleCercas.jsx` + hook `src/hooks/useCercasVisibles.js`: botón "🔲 Cercas" arriba a la derecha de cada mapa, preferencia persistida en `localStorage` (`rsm_cercas_visibles`, default visible)
- Integrado en los 6 mapas del módulo: `MapaRecorrido.jsx` (detalle de recorrido, pantalla en curso del vaquero y wizard), `HeatmapPastoreo.jsx`, `VistaClasificacion.jsx`, `MapaComparacionPlanReal.jsx` (Plan vs Real) y `SimulacionRecorrido.jsx`
- Las 27 corraletas siguen siendo los únicos puntos seleccionables del mapa

### v0.5.0 — Flota vehicular
- App `apps/flota`: modelos `Vehiculo` (tipo, marca/modelo/año, kilometraje, estado activo/en_taller/de_baja, vencimientos de tenencia/placas, foto), `ChecklistVehiculo` (salida/llegada, responsable, km, 17 ítems booleanos de inspección visual/mecánica/accesorios + nivel de combustible, validación), `FotoChecklist` (máx. 6 fotos) y `AlertaFlota` (tipo, km_alerta o fecha_alerta, activa/resuelta)
- Data migration `0002_precarga_vehiculos` carga los 6 vehículos reales del rancho (Savana, Blazer, Polaris, Cuatrimoto Roja, Moto Azul, Camión) como placeholder hasta recibir el Excel definitivo
- Señales (`signals.py`): al guardar un checklist de llegada, sube `kilometraje_actual` del vehículo si el km reportado es mayor; al guardar un vehículo, crea `AlertaFlota` si tenencia o placas vencen en los próximos 30 días
- Tarea Celery `revisar_alertas_flota` (diaria, 6:00 am): notifica (consola) alertas activas por km/fecha, genera alerta de cambio de aceite cada 5,000 km y de calibración de llantas si pasan 90 días sin checklist
- Endpoints: `GET/POST /api/v1/flota/vehiculos/`, `GET/PATCH/DELETE /api/v1/flota/vehiculos/{id}/` (eliminar solo `superadmin`), `GET /api/v1/flota/vehiculos/{id}/historial/`, `GET/POST /api/v1/flota/checklists/`, `GET/PATCH /api/v1/flota/checklists/{id}/` (validar), fotos de checklist (subir/eliminar), `GET /api/v1/flota/alertas/`, `PATCH /api/v1/flota/alertas/{id}/resolver/`, `GET /api/v1/flota/resumen/`
- Permisos: `campo`/`administrador`/`superadmin` crean checklist; solo `administrador`/`superadmin` validan y gestionan alertas; solo `operaciones`/`superadmin` editan vehículos; solo `superadmin` elimina
- 13 tests backend (82 totales): checklist salida/llegada, actualización de km al llegar (sube y no retrocede), máximo 6 fotos, alerta de vencimiento a 30 días, permisos de validación y edición de vehículo, resolver alerta, resumen
- Frontend: dashboard `/flota` con grid de tarjetas por vehículo (foto/ícono según tipo, estado, km, último checklist, badge de alertas activas) y panel lateral de alertas activas para `administrador`/`superadmin`
- Wizard de checklist de 3 pasos: identificación (selector de vehículo con cards, salida/llegada, responsable, km, slider de combustible con color), inspección (3 secciones colapsables con 17 checkboxes + contador de ítems verificados), evidencia fotográfica (hasta 6 fotos)
- Vista detalle de vehículo (editable para `operaciones`/`superadmin`), alertas activas con botón "Marcar como resuelta", historial de checklists con detalle completo (fotos + validación con observaciones para `administrador`/`superadmin`)
- Vista de alertas de toda la flota (solo `administrador`/`superadmin`) con filtros por vehículo/tipo, badge de urgencia (🔴 crítico / 🟡 próximo / 🟢 preventivo) y resolución con notas
- Widget `ResumenFlota` exportable para el dashboard (vehículos activos, alertas activas/críticas, vehículos sin checklist en 48h)

### v0.5.1 — Flota: 20 vehículos reales (ajuste Módulo 5)
- Migración `0003_vehiculo_equipo_tipos_anio_opcional`: agrega campo `equipo` (`CharField`, blank) para el nombre oficial del equipo; `Vehiculo.Tipo` gana `polaris`, `can_am`, `remolque`, `traila`, `maquinaria`, `plataforma`, `van`; `anio` pasa a `null=True, blank=True`
- Data migration `0004_reemplazo_vehiculos_reales`: elimina los 6 vehículos placeholder (Savana, Blazer, Polaris, Cuatrimoto Roja, Moto Azul, Camión) y carga los 20 vehículos reales de la Reserva con marca/modelo/año/serie/km reales; año pendiente/N/A → `None`, kilometraje N/A o PDTE → `0.0`
- Serializer (`VehiculoSerializer`) y admin actualizados para exponer/buscar por `equipo`
- Frontend: `TIPO_ICONOS`/`TIPO_LABELS` ampliados con los 7 tipos nuevos; fallback de etiqueta en `DetalleVehiculo.jsx`
- Test `TOTAL_VEHICULOS_PRECARGADOS` actualizado de 6 a 20; 13/13 tests de flota OK

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

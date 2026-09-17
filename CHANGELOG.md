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

### v0.2.2 — Mapa de cazuelas por noria de origen (ajuste Módulo 2)
- Modelo `Cazuela` (`nombre` único, `noria` — rosita/margaritas/chapote, `lat`/`lng`, `activa`, `notas`)
- Data migration precarga las 36 cazuelas reales (12 Rosita, 14 Margaritas, 10 Chapote) con sus coordenadas GPS
- Endpoint `GET /api/v1/hidraulica/cazuelas/` (cualquier usuario autenticado, filtro opcional `?noria=`)
- Tests de modelo y endpoint (conteo por noria, filtro, acceso sin autenticación)
- Frontend: nueva pestaña "🗺️ Cazuelas" en `/hidraulica` — `MapaCazuelas.jsx` con mapa Leaflet satelital (Esri World Imagery), 36 marcadores coloreados por noria (🔵 Rosita, 🟢 Margaritas, 🟠 Chapote), capa de cercas del rancho superpuesta (`CapaCercas`, toggle existente reutilizado)
- Panel lateral con leyenda por noria (conteo de cazuelas) y toggle independiente para mostrar/ocultar cada noria
- El campo `activa` de la cazuela es la señal de "fuera de servicio": una cazuela inactiva se dibuja atenuada con ícono ⚠️ superpuesto; banner de alerta por noria ("Falla detectada en Noria X — N cazuelas afectadas") aparece cuando alguna de sus cazuelas está marcada inactiva; `administrador`/`superadmin` ven además el detalle de qué cazuelas están afectadas por noria
- Nota de diseño: no existe relación real entre `RegistroHidraulico.punto_medicion` (pilas/fluxómetros/manómetros/pluviómetros) y las cazuelas/norias, así que la detección de falla usa el campo `activa` de `Cazuela` en vez de intentar correlacionar con los registros hidráulicos existentes

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

### v0.4.5 — Ganado: submódulo SPOT Trace, rastreo satelital en tiempo real (ajuste Módulo 4)
- App `apps/ganado` recibe 3 modelos nuevos: `AsignacionSpot` (recorrido opcional vinculado, activa/fecha_inicio/fecha_fin, asignado_por, notas — solo una activa a la vez, crear una nueva cierra automáticamente la anterior), `PosicionSpot` (`spot_message_id` único para evitar duplicados, lat/lng, altitud, `fecha_hora_spot` parseada de forma robusta desde el string ISO8601 de la API SPOT, `message_type` TRACK/STOP/OK/HELP/CUSTOM, `bateria` GOOD/LOW/CRITICAL, `dentro_perimetro`) y `AlertaSpot` (tipo sin_senal/fuera_perimetro/bateria_baja/bateria_critica, mensaje, posición asociada, resuelta/resuelta_por/resuelta_en)
- Tareas Celery en `apps/ganado/tasks.py`: `consultar_spot` (cada 5 min, consulta el feed público de SPOT `SPOT_FEED_ID`, valida cada posición contra el polígono real "SantaMargarita" con `shapely` y genera alertas de perímetro/batería) y `verificar_sin_senal` (cada hora, alerta si pasan más de 2 horas sin una posición nueva, sin duplicar la alerta si ya hay una activa)
- Variables de entorno nuevas: `SPOT_FEED_ID`, `SPOT_API_BASE`; dependencias `requests` y `shapely` agregadas a `requirements.txt`
- Endpoints: `GET /api/v1/ganado/spot/estado/` (última posición, batería, minutos sin señal, dentro/fuera de perímetro, asignación activa), `GET /api/v1/ganado/spot/posiciones/` (del día o `?fecha=`), `GET /api/v1/ganado/spot/alertas/` (no resueltas), `PATCH /api/v1/ganado/spot/alertas/{id}/resolver/`, `POST /api/v1/ganado/spot/asignaciones/`, `PATCH /api/v1/ganado/spot/asignaciones/{id}/desactivar/` — todos exclusivos para `administrador`/`superadmin` (permiso `PuedeVerSpot`)
- 4 tests nuevos en `apps.ganado` (27 totales del módulo, 155 en todo el backend): posición duplicada no se guarda dos veces, alerta de fuera de perímetro se genera con posición real, alerta de sin señal no se duplica si ya hay una activa sin resolver, rol `campo` recibe 403 en todos los endpoints SPOT
- Frontend: nueva pestaña "📡 SPOT Trace" en `/ganado` (solo `administrador`/`superadmin`) — `SpotTrace.jsx` con panel de estado (batería con badge de color, minutos desde última señal actualizados cada 30s, alertas activas con botón de resolver, formulario de asignación/cierre) y mapa satelital con el perímetro real "SantaMargarita" (mismas coordenadas de `cercasRancho.js`, sin duplicar la fuente de verdad), `CapaCercas` superpuesta, corraletas, rastro SPOT del día (línea + marcador pulsante en la última posición + marcador de advertencia en posiciones fuera de perímetro), auto-refresh cada 5 minutos, selector de fecha para historial y tabla con exportación CSV
- Ajuste al polígono "SantaMargarita" (sesión previa, mismo día): las 9 "Pasta N" fabricadas a mano en `cercasRancho.js` se reemplazaron por el polígono único real extraído del KMZ oficial del rancho (`cercas.kmz`), que es la fuente de verdad reutilizada por el nuevo perímetro de alerta de SPOT Trace

### v0.4.6 — Ganado: SPOT Trace mobile-first para Campo y mapa bajo demanda (ajuste Módulo 4)
- Backend: permiso nuevo `PuedeActivarSpot` (rol `campo` incluido) separado de `PuedeVerSpot` (solo admin). `GET /spot/estado/`, `POST /spot/asignaciones/` y `PATCH /spot/asignaciones/{id}/desactivar/` ahora los puede usar Campo para iniciar/terminar su propio recorrido; `GET /spot/asignaciones/` (historial completo), `GET /spot/posiciones/` y `GET /spot/alertas/` siguen exclusivos de `administrador`/`superadmin`
- Frontend: nuevo componente `IniciarRastreoSpot.jsx` — vista mobile-first para Campo con un solo campo (título del recorrido) y un botón grande "▶️ Iniciar recorrido" / "🛑 Terminar recorrido", sin mapa ni historial. La pestaña "📡 SPOT Trace" en `/ganado` ahora es visible para Campo (antes oculta) y renderiza esta vista simple; Admin/Superadmin siguen viendo el panel completo (`SpotTrace.jsx`)
- `SpotTrace.jsx` (panel admin) rediseñado: el mapa ya no se muestra por defecto — solo aparece al hacer clic en un recorrido del "Historial de recorridos" o en "📅 Ver por fecha"; se agregó botón "🗺️ Ver mapa en vivo" en la asignación activa y columna "Fecha" en la tabla de posiciones para confirmar de un vistazo que todas las filas son del mismo día
- 2 tests nuevos en `apps.ganado` reemplazan el test `test_solo_admin_ve_spot` (ya no aplica): Campo ve `/spot/estado/` pero recibe 403 en historial/posiciones/alertas, y Campo puede crear y desactivar su propia asignación (34 tests totales del backend)
- **Fix (encontrado en prueba real con el dispositivo RSM2026 en el VPS):** `PosicionSpot.asignacion` y `AlertaSpot.asignacion` eran FK obligatorios, y `consultar_spot` descartaba por completo cualquier mensaje del feed si no había una asignación activa en el momento del poll — un mensaje que llegara con retraso satelital justo después de que el vaquero cerrara su recorrido se perdía para siempre. Migración `0010_alter_alertaspot_asignacion_and_more` hace ambos campos `null=True` (`on_delete=SET_NULL`). `consultar_spot` ya no descarta ningún mensaje: si hay asignación activa la usa; si no, busca la última asignación cerrada cuya ventana `fecha_inicio`–`fecha_fin` contiene la hora real del mensaje, o si llegó dentro del margen de `HORAS_SIN_SENAL` (2h) después de cerrarla, se lo vincula igual; más allá de ese margen se guarda con `asignacion=None` en vez de perderse (sigue visible en `/spot/estado/` y en "Ver por fecha" del historial). 2 tests nuevos: mensaje tardío dentro del margen se vincula al recorrido recién cerrado, mensaje muy tardío se guarda sin asignación (36 tests totales en `apps.ganado`)

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
- App `apps/inventario`: modelos `CategoriaInventario` (8 categorías con color/ícono), `Ubicacion` (bodega/granero/hangar), `Producto` (código único, categoría, ubicación, unidad de medida, stock actual/mínimo) y `MovimientoInventario` (entrada/salida, stock antes/después, responsable, uso o proveedor/factura, código de vehículo para combustibles, referencia de proyecto, validación, rechazo con reversión de stock, foto de evidencia)
- Data migrations: `0002_precarga_categorias_ubicaciones` (8 categorías + 3 ubicaciones) y `0003_precarga_productos` (121 productos reales del Excel con su stock actual y mínimo)
- `MovimientoInventarioSerializer.create()` actualiza `producto.stock_actual` de forma atómica antes de crear el movimiento (evita stock negativo — valida cantidad de salida contra stock disponible)
- Señal `alertar_stock_minimo` dispara la tarea Celery `alertar_stock_bajo_inmediato` en cuanto un movimiento deja el stock en o bajo el mínimo; tarea periódica `revisar_stock_minimo` (diaria, 5:00 pm — ventana en la que Yajaira actualiza el inventario) imprime en consola el listado completo de reabasto
- Endpoint `PATCH /movimientos/{id}/validar/` con acciones `validar`/`rechazar` (rechazar exige nota y revierte el stock automáticamente)
- Permisos por rol: `campo`/`inventario`/`administrador`/`superadmin` registran salidas; solo `inventario`/`administrador`/`superadmin` registran entradas; solo `inventario`/`superadmin` validan movimientos (Erik/Abigail no pueden); `operaciones` no registra movimientos pero sí ve alertas de stock; catálogo (productos/categorías) editable por `inventario`/`administrador`/`superadmin`; historial de movimientos filtrado — `campo` solo ve los suyos
- Endpoints completos: `productos/`, `productos/{id}/movimientos/`, `movimientos/`, `movimientos/{id}/validar/`, `categorias/`, `ubicaciones/`, `alertas-stock/`, `resumen/`
- 20 tests backend (145 totales en el proyecto): salida reduce stock, entrada aumenta stock, stock no puede quedar negativo, alerta de stock mínimo se genera, permisos de validación/registro por rol, rechazo revierte stock, visibilidad de movimientos por rol, alertas-stock, creación de producto
- Frontend: `/inventario` con dashboard de tabs por categoría (8 cards con ícono/color, total de productos, badge de alerta), lista de productos con buscador y filtros (categoría/ubicación/estado de stock con badges 🔴🟡🟢), formulario de nuevo producto
- Wizard de movimiento en 3 pasos (buscador de producto con autocomplete, tipo entrada/salida según rol; cantidad + responsable + sugerencias rápidas de uso + selector de vehículo para combustibles, o proveedor/factura/foto si es entrada; confirmación con stock resultante y advertencias de stock en cero/mínimo)
- Vista de validación (Yajaira/superadmin): cola de movimientos sin validar con botones Validar/Rechazar (nota obligatoria al rechazar)
- Historial de movimientos con filtros de fecha/tipo y exportación CSV (`inventario`/`administrador`/`superadmin`)
- Widget `ResumenInventario` exportable (productos en alerta, movimientos del día, entradas sin validar) — visible solo para `inventario`/`administrador`/`superadmin`
- Ruta `/inventario` registrada en `App.jsx`; `modules.js` actualizado con `ruta` y acceso a los 5 roles (todos ven stock básico)

### v0.6.1 — Inventarios: flujo de adquisiciones (ajuste Módulo 6)
- 7 modelos nuevos en `apps/inventario` siguiendo el Protocolo de Adquisición, Recepción y Envío de Material (RSM, junio 2026): `SolicitudMaterial` (folio autogenerado `SM-<año>-NNN`, área, estado con 8 pasos: borrador → enviada → autorizada/rechazada → en_compra → enviada_rancho → recibida_parcial/completa), `ItemSolicitud` (producto de catálogo o descripción libre para producto nuevo), `EnvioMaterial` + `FotoEnvio` (evidencia de salida/llegada), `RecepcionMaterial` + `ItemRecepcion` (checklist por ítem: OK/dañado/faltante, con foto opcional), `ReporteFaltanteDanio` (faltante/daño/irregularidad con foto y resolución)
- Señales: al marcar una solicitud `recibida_completa` se generan automáticamente las entradas de `MovimientoInventario` por cada ítem con producto de catálogo (evita duplicados si ya se había marcado antes); al crear un `ReporteFaltanteDanio` se dispara la tarea Celery `alertar_nuevo_reporte_faltante_danio`; validación (signal + serializer) de que `RecepcionMaterial.recibido_por` nunca sea la misma persona que `EnvioMaterial.enviado_por`
- Endpoints: `solicitudes/` (crear con ítems anidados, borrador o enviada para autorización), `solicitudes/{id}/autorizar|rechazar/`, `solicitudes/{id}/enviar/` (multipart: cantidades por ítem + 1-4 fotos de salida), `solicitudes/{id}/recepciones/` (multipart: checklist por ítem + foto opcional por ítem dañado/faltante + 1-4 fotos de llegada), `solicitudes/{id}/comparativo/` (solicitado vs. enviado vs. recibido), `reportes-faltantes/` y `reportes-faltantes/{id}/resolver/`
- Permisos: crear solicitud y reportar faltante — todos los roles; autorizar/rechazar — `administrador`/`superadmin`; registrar envío — `operaciones`/`administrador`/`superadmin`; registrar recepción — `campo`/`inventario`/`administrador`/`superadmin`; resolver reporte — `inventario`/`administrador`/`superadmin`; comparativo — solo `inventario`/`administrador`/`superadmin`
- 8 tests nuevos (138 totales en el backend): folio autogenerado único, solo admin autoriza, recibido_por distinto de enviado_por (permitido y rechazado), recepción completa genera entrada de inventario, reporte de faltante genera alerta, permisos de envío/recepción/comparativo por rol
- Frontend: nueva sección "📦 Adquisiciones" en `/inventario` con sub-tabs [Solicitudes][Faltantes y daños] — lista de solicitudes con tabs por estado y badges de color, formulario de nueva solicitud en 3 pasos (área/necesidad → buscador de producto con toggle "producto nuevo" → confirmar y enviar/guardar borrador), detalle con timeline de 5 pasos, autorizar/rechazar con notas, comparativo enviado-vs-recibido (solo roles con reporte completo), formulario de envío (cantidad por ítem, vehículo, 1-4 fotos), checklist de recepción mobile-first (cantidad + estado OK/dañado/faltante + foto por ítem, fotos de llegada, genera entradas de inventario automáticamente al guardar), y reportes de faltantes/daños con formulario y resolución

### v0.6.2 — Inventarios: solicitudes de material sin autorización manual (ajuste Módulo 6)
- Se elimina el campo `SolicitudMaterial.fecha_requerida` (migración `0008_remove_solicitudmaterial_fecha_requerida`) — ya no se captura una fecha límite; la UI usa directamente `created_at` (fecha real de la solicitud) donde antes mostraba "Requerido"
- Las solicitudes de material ya no pasan por autorización manual: es comunicación directa entre solicitante y quien captura (Erik le indica a Yajaira material/proyecto y ella crea la solicitud). `SolicitudMaterialSerializer.create()` promueve automáticamente `enviada` → `autorizada` al crear, sin tocar el resto del flujo (compra → envío → recepción sigue igual). Los endpoints `autorizar`/`rechazar` se dejan intactos (sin uso para solicitudes nuevas, pero funcionales para cualquier registro legacy en `enviada`) — quedan reservados para la futura autorización de cotizaciones de proyectos
- Frontend: se quita el campo "Fecha requerida" del formulario de nueva solicitud; el botón de envío pasa de "Enviar para autorización" a "Crear solicitud"; el estado/tab `autorizada` se relabelea de "Autorizada" a "Lista para compra" para no sugerir una aprobación manual que ya no ocurre
- Tests actualizados en `apps.inventario` (42/42 OK): se reemplaza el test de autorización manual por uno que confirma la promoción automática al crear, y se ajustan los tests que encadenaban compra/envío/recepción para ya no llamar a `/autorizar/` de por medio
- Se agrega `PATCH /solicitudes/{id}/compra/` (misma vista que el `POST` de registro) para corregir el monto/proveedor/foto/notas/comprador de una compra ya registrada, mientras la solicitud siga `en_compra` (antes de registrar el envío al rancho — una vez enviada, el monto queda fijo). `FormularioCompra.jsx` detecta el modo edición automáticamente cuando `solicitud.compra` ya existe; `DetalleSolicitud.jsx` agrega el botón "✏️ Editar compra" en ese estado. 4 tests nuevos (46/46 OK en `apps.inventario`)
- Nota de voz opcional en la recepción de material (campo `RecepcionMaterial.audio`, migración `0009_recepcionmaterial_audio`) — mismo componente de grabación tap-to-record que Flota (con fallback de subir audio si el navegador bloquea el micrófono), adaptado al tema oscuro de Inventario como copia independiente (`ChecklistRecepcion.jsx` → `GrabadorAudio.jsx`) para no acoplar los dos módulos. El "recibido por" (ya automático desde el backend) ahora se muestra como banner destacado en vez de texto pequeño. 2 tests nuevos (48/48 OK en `apps.inventario`)
- Rol Campo: `/inventario` ahora muestra solo `RecepcionMaterialCampo.jsx` (tarjetas de solicitudes `enviada_rancho`/`recibida_parcial`) y "+ Movimiento"; se ocultan dashboard de stock, historial y crear solicitud/reportar faltante. `SolicitudListCreateView` acepta `?estado=` con varios valores separados por coma para poder pedir ambos estados a la vez. 1 test nuevo (49/49 OK en `apps.inventario`)
- `RecepcionFacil.jsx` — checklist de recepción rediseñado para Campo como wizard de una decisión grande a la vez (¿llegó todo bien? → si no, un material a la vez con 3 botones grandes → foto + nota de voz → confirmar), en vez del formulario denso de una sola pantalla. `ChecklistRecepcion.jsx` no se tocó y sigue siendo el que usan los roles administrativos desde `DetalleSolicitud`
- La recepción de Campo ya NO sube el stock automáticamente — se quita la señal `generar_entradas_por_recepcion_completa`. Nuevo endpoint `POST /solicitudes/{id}/recepciones/{recepcion_id}/dar-entrada/` (roles inventario/administrador/superadmin): Yajaira revisa lo que reportó Campo contra la compra y confirma; ahí se crea el `MovimientoInventario` (ya ligado a la solicitud vía el nuevo campo `MovimientoInventario.solicitud`, y `validado=True` de una vez, porque su revisión es la validación). `RecepcionMaterial` suma `entrada_confirmada`/`entrada_confirmada_por`/`entrada_confirmada_en` para no poder dar entrada dos veces. Migración `0010_movimientoinventario_solicitud_and_more`. Las entradas manuales por "+ Movimiento" (sin solicitud) no cambian — siguen pasando por el "Validar" de siempre. `DetalleSolicitud.jsx` ahora muestra las recepciones reportadas (fotos, audio, ítems) con el botón "Dar entrada"; la pestaña "Recibidas" de Adquisiciones ahora incluye `recibida_parcial` además de `recibida_completa`. 3 tests nuevos (52/52 OK en `apps.inventario`)

### v0.6.3 — Inventarios: entrada de stock solo vía Adquisiciones, "Validar" reemplazado por "Cancelar" (ajuste Módulo 6)
- `MovimientoInventarioSerializer` rechaza con 400 cualquier intento de crear un movimiento `tipo=entrada` — la única forma de dar entrada a un producto es Adquisiciones (Solicitud → Envío → Recepción → Dar entrada). Se quita por completo el atajo de "compra vía movimiento directo" (`monto_compra`/`comprado_por`) que generaba una `Compra` sin pasar por Solicitud
- `ValidarMovimientoView`/`ValidarMovimientoSerializer` (`validar`/`rechazar`) se reemplazan por `CancelarMovimientoView`/`CancelarMovimientoSerializer` en `PATCH /movimientos/{id}/cancelar/` (mismos roles: inventario/superadmin) — solo cancela salidas (400 en entradas o en una ya cancelada), nota siempre obligatoria, revierte el stock al valor previo. `ResumenInventarioView` pierde el contador `entradas_sin_validar`
- El PATCH genérico a un movimiento ya no revalida stock/vehículo si no se toca `cantidad`, para permitir editar solo la nota sin volver a chocar contra el stock actual (que puede haber bajado por movimientos posteriores)
- Frontend: `WizardMovimiento` ("+ Movimiento") ahora solo registra salidas — se quita el selector de tipo, los campos de compra y la creación de producto inline (usar "Lista de productos" para dar de alta un producto). `VistaValidacion.jsx` se reemplaza por `VistaCancelacion.jsx`: en vez de una cola de pendientes, se busca por fecha entre las salidas del día y se cancela la que esté mal capturada. `HistorialMovimientos.jsx` cambia la columna de estado de "Sin validar"/"Rechazado" a "Vigente"/"Cancelado"
- 51/51 tests en `apps.inventario` (se reescriben los tests de validar/rechazar como cancelar, se quita la clase de tests de compra-vía-movimiento, se agregan casos para el PATCH de notas sin revalidar stock)

### v0.7.0 — Registro de ganado por arete
> Pendiente

### v0.8.0 — Sanidad animal
> Pendiente

### v0.9.0 — Personal
> Pendiente

### v1.0.0 — Minuta automática
> Pendiente

### v1.1.0 — Facturación
- App `apps/facturacion` con 2 modelos: `Factura` (folio interno autogenerado `FAC<año>-NNN`, número/folio del proveedor, fecha, concepto, importe, archivo PDF/imagen opcional, módulo de origen con 9 opciones, referencia libre a otro módulo, `mes_reporte` calculado automáticamente por señal `pre_save` desde `fecha`) y `RelacionMensual` (mes único, total, número de facturas, archivo Excel generado)
- Generación del Excel mensual (`apps/facturacion/excel.py`, `openpyxl`) que replica exactamente el formato que Minerva manda a la contadora: fila 1 vacía, fila 2 encabezados FECHA/FACTURA/CONCEPTO/IMPORTE con fondo azul marino y texto blanco, datos ordenados por fecha ascendente con fecha en formato `DD-Mon-YY` (en inglés, fijo sin depender del locale de Excel), importe con formato `$#,##0.00`, fila de suma en negritas al final, anchos de columna 15/45/35/15
- Endpoints: `facturas/` (CRUD), `facturas/por-mes/`, `resumen/` (total y desglose por módulo del mes actual), `relaciones/generar/` (genera y guarda el Excel; regenerar el mismo mes actualiza la relación existente en vez de duplicarla), `relaciones/` (historial), `importar/` (GET lista compras con factura adjunta de Inventarios/Proyectos que aún no están en Facturación, POST copia el archivo y crea las facturas — evita duplicados por `modulo_origen`+`referencia_id`)
- El import reutiliza `apps.inventario.models.Compra` (siempre tiene `foto_factura`) y `apps.proyectos.models.CompraProyecto` (solo se ofrece si tiene al menos una `FotoCompra`), copiando el archivo en vez de enlazarlo para que Facturación no dependa de que el registro de origen siga existiendo
- Permisos: CRUD de facturas y ver relaciones — administrador/superadmin; ver resumen — además operaciones; generar relación e importar de otros módulos — solo superadmin
- 8 tests nuevos en `apps.facturacion`: folio autogenerado, `mes_reporte` autocalculado, formato exacto del Excel (encabezados, fechas, orden), suma total correcta, solo superadmin genera la relación, campo/operaciones sin acceso a facturas, resumen visible para operaciones, regenerar una relación actualiza sus totales sin duplicar el registro
- Frontend: página `/facturacion` (administrador/superadmin) con 3 pestañas — Dashboard (selector de mes tipo `<input type="month">`, cards de total/número de facturas, desglose por módulo con barras, botón "Generar relación Excel" que descarga automáticamente, historial de relaciones con descarga), Facturas (filtros por mes/módulo/búsqueda, tabla con total al fondo, alta/edición/eliminación) e Importar desde módulos (solo superadmin: selector Inventarios/Proyectos, checklist de compras con factura adjunta, badge "Ya importada")
- Widget `ResumenFacturacion` en el Dashboard principal (administrador/superadmin) con total del mes y botón rápido de generar relación para superadmin

### v0.12.0 — Proyectos
- App `apps/proyectos` con 10 modelos: `Contratista` (catálogo de mano de obra/proveedores), `Proyecto` (folio autogenerado `PRY<año>-NNN`, estados borrador→autorizado→en_progreso→pausado→completado/cancelado, `requiere_autorizacion` calculado por señal cuando `presupuesto_total` supera $50,000 MXN, asignado a un usuario), `CotizacionManoObra` (por contratista, con archivo adjunto y aprobación de superadmin), `ItemProyecto` (inventario propio del proyecto, independiente del inventario general, `codigo_proyecto` autogenerado tipo `PRY001-SM-001`/`PRY001-NUEVO-001`), `MovimientoProyecto` (entrada/salida/devolución con stock antes/después), `CompraProyecto` (folio `CMP<año>-NNN`, autorización automática si supera $50,000), `FotoCompra`, `AvanceProyecto` (porcentaje + descripción + fotos), `FotoAvance` y `DevolucionInventario`
- Señal `post_save` de `DevolucionInventario` genera automáticamente el `MovimientoProyecto` tipo devolución (descuenta del proyecto) y el `MovimientoInventario` tipo entrada en `apps.inventario` (sube el inventario general) — el material sobrante regresa formalmente al inventario general
- Permisos por rol: crear/editar proyecto y autorizar (proyecto o compra > $50k) — solo superadmin; gestionar cotizaciones/compras/inventario del proyecto — operaciones/superadmin; registrar avances — operaciones/campo/superadmin; CRUD de contratistas — operaciones/administrador/superadmin. Operaciones solo ve los proyectos que tiene asignados; administrador/superadmin ven todos
- Endpoints completos: `proyectos/`, `proyectos/{id}/autorizar|rechazar/`, `proyectos/{id}/cotizaciones/` + `aprobar/`, `proyectos/{id}/compras/` + `autorizar/`, `proyectos/{id}/avances/`, `proyectos/{id}/inventario/` + `movimiento/` + `devolver/`, `contratistas/`, `resumen/`
- 10 tests nuevos en `apps.proyectos`: proyecto/compra >$50k requiere autorización, solo superadmin autoriza (Erik no puede), folio autogenerado único, Erik no puede crear proyecto, stock del proyecto no puede quedar negativo, devolución sube el inventario general, CRUD de contratistas por rol, operaciones solo ve proyectos asignados
- Frontend: `src/pages/Proyectos/` — dashboard con cards por estado (contador clicable), lista con badge rojo parpadeante para proyectos pendientes de autorización; detalle con tabs [Resumen][Cotizaciones][Compras][Inventario][Avances] (banner de autorización para superadmin, selector de contratista con alta inline, aviso automático de compra >$50k, buscador de catálogo general o material nuevo para el inventario del proyecto, wizard de avance de 2 pasos con slider de porcentaje y 1-6 fotos); catálogo de contratistas con buscador y alta/edición; widget `ResumenProyectos` conectado directamente al Dashboard principal (proyectos en progreso, pendientes de autorización con badge rojo — solo operaciones/administrador/superadmin); ruta `/proyectos` protegida por rol

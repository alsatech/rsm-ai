## ANÁLISIS DE MINUTA — 2026-09-01

### ✅ YA CUBIERTO POR EL SISTEMA

| Tema en la minuta | Módulo que lo cubre | Cómo |
|---|---|---|
| Campeo de ganado de norte a sur, salida de "corraleta del lunes" hacia "corraleta del rey", pegados a la cerca, regreso a dormir | **Módulo 4 — Ganado (recorridos GPS)** | Flujo iniciar/agregar paradas con catálogo de 27 corraletas + puntos libres, offline con sync, capa de cercas reales, narrativa libre y responsable/asistentes |
| "Ya solo le faltan dos días para terminar de trabajar la pasta" | **Módulo 4 — Clasificación de pastoreo + Plan vs Real** | Clasificación por percentiles y plan del día vs recorrido real permiten ver cobertura de pastas |
| Recorrido del SH: pilas, manómetros, fluxómetros | **Módulo 2 — Hidráulica** | `RegistroHidraulico` con 10 puntos de medición, estados normal/alerta/falla, foto y validación por Abigail |
| Revisión de cazuelas | **Módulo 2 — Ajuste v0.2.2** | Mapa de 36 cazuelas agrupadas por noria (Rosita/Margaritas/Chapote) con estado activa/inactiva |
| Fuga en manguera del arroyo del caballo (3B) reparada | **Módulo 2 + Módulo 3** | Registro hidráulico en estado falla dispara alerta Celery; el seguimiento puede vivir como Pendiente |
| Chino sale en el cuatrimoto azul | **Módulo 5 — Flota** | Cuatrimotos ya dadas de alta como vehículos reales con horómetro (ajuste 2026-08-26); checklist salida/llegada |
| Camioncito en revisión/reparación en CA | **Módulo 5 — Flota** | `Vehiculo.estado = en_taller` |
| Winch del Polaris 700 y reparación del Polaris 900 pendientes desde abril | **Módulo 3 — Pendientes rastreables** | Pendientes con estado bloqueado/motivo, historial y responsable |
| Compra de pipa 2" (40 pzas) y varilla 1" (100 pzas) para el proyecto de corrales | **Módulo 6 — Adquisiciones + Módulo 12 — Proyectos** | Solicitud → compra (con edición de monto) → envío → recepción; inventario propio del proyecto de corrales |
| Envío parcial: se mandaron 80 varillas y 17 pipas, quedan 23 pipas y 20 varillas | **Módulo 6 — Adquisiciones** | `EnvioMaterial` + `RecepcionMaterial` con estado `recibida_parcial` y comparativo solicitado/enviado/recibido |
| Bidones marcados gasolina (rojo) / diésel (verde) | **Módulo 6 — Inventarios** | Categoría de combustibles con código de vehículo en la salida |
| Evidencia fotográfica solicitada (manguera, pollito, muestras del vivero) | **Módulos 2/3/4/5/6** | Todos los módulos ya soportan fotos; Inventario y Flota además nota de voz |
| Código de colores por responsable (amarillo=ADMON, verde=Operación, azul=EY…) | **Módulo 3 — Pendientes** | Asignación M2M + origen + módulo relacionado sustituye el color |

---

### ⚠️ PARCIALMENTE CUBIERTO

1. **Recorrido de agua incluye "charcos" y "cazuelas" como puntos de revisión diaria**
   Hidráulica tiene 10 puntos de medición fijos (pilas/fluxómetros/manómetros/pluviómetros) y el mapa de cazuelas es solo visual. *Falta:* poder levantar un registro de revisión por cazuela y por charco (estado, nivel, fuga sí/no) desde el mapa, para que la falla por noria salga de datos reales y no del flag `activa`.

2. **Pendientes que llevan meses sin avance (eléctrico 26-04, winch 24-04, patas de cajones, protocolo de abejas)**
   El módulo 3 rastrea estados e historial, pero no hay presión automática. La minuta está llena de reclamos del Lic. ("ESTAMOS A 31, ¿QUÉ AVANCE?", "¿POR QUÉ NO CONTESTAN?"). *Falta:* antigüedad visible, escalamiento automático por días sin movimiento, y alerta Celery a Alberto/Minerva de pendientes estancados.

3. **Evidencia solicitada y no entregada ("no enviaron evidencia, se le solicitó")**
   Las fotos son siempre opcionales. *Falta:* marcar un pendiente/registro como "requiere evidencia" y que no se pueda cerrar sin foto, con recordatorio automático.

4. **Reparaciones de vehículos con seguimiento largo (camioncito, Polaris 900, winch Polaris 700)**
   Flota tiene `estado=en_taller` y bitácora de aceite, pero no bitácora de reparaciones/taller. *Falta:* modelo `ReparacionVehiculo` (fecha entrada, taller/lugar, descripción, costo, estado, fecha estimada de salida, responsable de seguimiento).

5. **Becerro faltante para destete, ubicado en el rancho del rey, se recoge en camioneta**
   Módulo 7 (registro por arete) está pendiente. *Falta:* eventos de movimiento de animal (destete, traslado entre corraletas/predios, animal fuera del perímetro) — nótese que hoy solo el SPOT Trace detecta "fuera de perímetro" y es del dispositivo, no del ganado.

6. **Saleros, bebederos y trampas de moscas revisados en cada campeo**
   El recorrido de ganado solo guarda narrativa libre. *Falta:* checklist estructurado por parada (salero lleno/vacío, chorro de agua OK, trampa de mosca con/sin actividad) para poder graficar y detectar patrones (relevante por el tema NWS).

7. **Combustible/gas LP: "consume 5% aprox. por mes, avisar con 75% y comprar al 50%"**
   Inventario maneja stock mínimo por producto en unidades, no por porcentaje de tanque. *Falta:* lectura periódica de nivel de tanque de gas con foto y umbrales (75% aviso, 50% orden de compra).

8. **Asistencia a la junta diaria y clima ("Temp alta 40° y 0% probabilidad de lluvia", "no se conectó Chilo")**
   No existe registro de la junta como tal (Módulo 10 pendiente). *Falta:* cabecera de junta con hora inicio/fin, asistentes, ausencias con motivo y condiciones climáticas del día.

---

### 🆕 NO ESTÁ EN EL SISTEMA — PROPUESTAS NUEVAS

**1. Submódulo Granja (animales menores + incubadora)**
Chino atiende diariamente: limpieza, alimentación 2x, revisión de incubadora, seguimiento de un pollito lesionado, marranitos con trampas de mosca. No hay dónde registrarlo.
- Encaja en: **Módulo 8 — Sanidad animal** (aún no construido) como submódulo `granja`, o app nueva `apps/granja`.
- Prioridad: **Alta** (es actividad diaria reportada todos los días)
- Complejidad: **Medio**

**2. Submódulo Apiario (abejas)**
Cajones instalados, bases/patas pendientes (4 de 8), revisión de habitación del cajón, suero azúcar-agua, atrayente BEE FAIT, protocolo y checklist pendientes de VoBo. Es un proyecto recurrente con reclamos semanales del Lic.
- Encaja en: app nueva `apps/apiario` o como tipo de proyecto en **Módulo 12**.
- Prioridad: **Alta** (es el pendiente más reclamado en la minuta)
- Complejidad: **Medio**

**3. Submódulo Vivero / Germinación de semillas**
Recolección de semillas de árbol madre, entrega en oficina CA, muestras por lote al Sr. Oscar, seguimiento de brotes con evidencia, muestra de pasta 5B.
- Encaja en: app nueva `apps/vivero` o **Módulo 12 — Proyectos** con tipo "vivero".
- Prioridad: **Media**
- Complejidad: **Medio**

**4. Constructor de Checklists / Protocolos configurables**
La minuta pide explícitamente y marca como "urgen": checklist de Supervisores, Apiario, Jardineros (recolección de semillas, puntos 1 al 4 del manual), Vivero. Además ya existen protocolos con flujo de VoBo (protocolo de abejas enviado el 28-08 sin respuesta).
- Encaja en: **módulo nuevo transversal** `apps/checklists` — plantillas configurables (nombre, área, ítems, frecuencia), llenado desde campo y flujo de VoBo con versión y fecha de aprobación.
- Prioridad: **Alta** (desbloquea 4 pendientes de la minuta de un solo golpe y evita hardcodear un checklist por área)
- Complejidad: **Complejo**

**5. Bitácora de distribución de agua (válvulas, rebombeos y riego)**
Hay reglas operativas críticas escritas en prosa y en MAYÚSCULAS dentro de la minuta: rebombeo Chapote→Uno prendido de día, llave al 4 Alto abierta 10–15% siempre, llave Chapote→Menchaca con flotador siempre abierta un poco, Margaritas todas las llaves abiertas + rebombeo a pila del Lunes, pila del Rancho rebombeando al Siete, riego de nogales de Los Leones cada 3 días (cada 4 si no se riegan árboles).
- Encaja en: **Módulo 2 — Hidráulica**, como catálogo `Valvula`/`Rebombeo` con estado esperado (configuración normal) + bitácora diaria de estado real y alerta si difiere; más calendario de riego con recordatorio cada 3/4 días.
- Prioridad: **Alta** (es conocimiento operativo que hoy solo vive en la cabeza de Chilo y en el Word)
- Complejidad: **Medio**

**6. Registro de asistencia y cuadrillas de personal que sube a la RSM**
Subió el equipo #2 (JH, Roberto, Fernando + 3 nuevos: Samuel, Walter, Kevin); Jorge Nava no subió por asuntos personales y traerá comprobante; Efrén Reyes sube más tarde con el Sr. Barboza; Cristofer baja a descanso mañana.
- Encaja en: **Módulo 9 — Personal** (pendiente) — agregar `Cuadrilla`, `SubidaBajada` (fecha, equipo, personas, vehículo, quien traslada) y ausencias con motivo/comprobante.
- Prioridad: **Alta** (aparece en cada minuta y alimenta nómina de Alexia)
- Complejidad: **Medio**

**7. Logística de traslados / viajes CA ↔ RSM**
El Sr. Barboza sube en la Blazer con 82 docenas de tamales y baja mañana el Polaris 1000 y a Cristofer; el Sr. EY cruza material a CA; envíos de varilla/pipa en viajes específicos.
- Encaja en: **Módulo 5 — Flota** (nuevo modelo `Viaje`: fecha, vehículo, chofer, origen/destino, pasajeros, carga que sube, carga que baja) enlazable con `EnvioMaterial` de Inventario.
- Prioridad: **Media**
- Complejidad: **Medio**

**8. Prevención y vigilancia de Gusano Barrenador (NWS) — heridas y trampas**
La minuta incluye la ficha técnica completa del NWS blowfly (heridas por garrapatas, castración, marcaje, alambre de púas; puesta en mucosas; ciclo de 7–65 días). Además ya se llevan trampas de moscas y revisión de saleros.
- Encaja en: **Módulo 8 — Sanidad animal**: registro de heridas por animal, tratamiento, revisión programada a 7 días, y bitácora de trampas de mosca por ubicación (con o sin actividad) para mapa de riesgo.
- Prioridad: **Alta** (riesgo sanitario y regulatorio real)
- Complejidad: **Medio**

**9. Hojas de sacrificio animal / trazabilidad de mortalidad y sacrificio**
"Las hojas del sacrificio animal se las entregó al Ing. RCG… no saben realmente el paradero de las hojas". Formato en papel que ya se está perdiendo.
- Encaja en: **Módulo 8 — Sanidad animal** o **Módulo 7 — Arete**: registro digital de sacrificio/mortalidad (fecha, arete, motivo, responsable, destino, foto).
- Prioridad: **Alta** (se perdieron documentos físicos; es exactamente lo que el sistema debe eliminar)
- Complejidad: **Simple**

**10. Trámites legales / documentos oficiales (UPP, poder notarial, tenencia, predial)**
Trámite UPP a nombre de Yajaira, poder ante síndico ($1,000) vs notario ($1,000–$3,500), contacto con Lic. Norma, fecha comprometida. El JD de Erik ya menciona notificaciones de tenencia y predial.
- Encaja en: app nueva `apps/tramites` o extensión de **Módulo 3 — Pendientes** con tipo "trámite" (entidad, responsable, costo estimado, fecha límite legal, documentos adjuntos, alertas Celery).
- Prioridad: **Media**
- Complejidad: **Simple**

**11. Caballos de remuda (equinos de trabajo)**
"El Bayo" y "El Moro" salen de remuda; hoy se llevan herraduras para ponerles una a cada uno.
- Encaja en: **Módulo 7 — Registro de ganado por arete** como categoría `equino` con su propia bitácora (herrado, estado, jinete asignado).
- Prioridad: **Baja**
- Complejidad: **Simple**

**12. Clima diario en la cabecera de la minuta**
Temperatura y probabilidad de lluvia se reportan todos los días y correlacionan con pluviómetros y con el ciclo del NWS.
- Encaja en: **Módulo 10 — Minuta automática** (campo de condiciones del día) alimentado opcionalmente por API de clima.
- Prioridad: **Baja**
- Complejidad: **Simple**

---

### 📋 PROMPTS SUGERIDOS PARA CLAUDE CODE

---
MÓDULO: Pendientes (Módulo 3)
CAMBIO: Antigüedad, escalamiento automático y evidencia obligatoria
PROMPT:
Ajuste al Módulo 3 (Pendientes rastreables) de RSM Sistema. NO tocar el resto del módulo, solo agregar lo siguiente.

Contexto real: en la minuta del 01-09-2026 hay pendientes abiertos desde el 24-04-2026 y 26-04-2026 (winch Polaris 700, cambios con el eléctrico, patas de cajones de abejas) y el Director escribe reclamos en mayúsculas por falta de seguimiento ("ESTAMOS A 31, ¿QUÉ AVANCE?", "¿POR QUÉ NO CONTESTAN?"). Además se repite el patrón "no enviaron evidencia, se le solicitó".

1) Backend (`apps/pendientes`):
- Agregar a `Pendiente`: `requiere_evidencia` (BooleanField, default False), `dias_sin_movimiento` (property calculada desde el último `HistorialPendiente` o `created_at`), `nivel_escalamiento` (0=normal, 1=atrasado, 2=crítico, calculado, no editable) y `ultima_solicitud_evidencia` (DateTimeField null).
- Validación: si `requiere_evidencia=True`, no se puede pasar a estado `cerrado` sin al menos una `FotoPendiente` con momento `cierre` (levantar ValidationError → HTTP 400 con mensaje en español).
- Nuevo endpoint `POST /api/v1/pendientes/{id}/solicitar-evidencia/` (administrador/superadmin): marca `requiere_evidencia=True`, sella `ultima_solicitud_evidencia` y agrega una entrada al historial.
- Nueva tarea Celery `revisar_pendientes_estancados` (diaria 6:30 am, agregar a CELERY_BEAT_SCHEDULE en settings.py como ya hace el resto del proyecto): pendientes abiertos/en_proceso/bloqueados con más de 7 días sin movimiento → nivel 1; más de 30 días → nivel 2; notifica en consola a Alberto y Minerva con folio, título, responsable y días transcurridos. No duplicar la notificación el mismo día.
- Extender `GET /api/v1/pendientes/resumen/` con `estancados_7d`, `estancados_30d` y `sin_evidencia_solicitada`.
- Filtro nuevo `?estancados=7|30` en el listado.

2) Frontend:
- En `VistaListaAdmin.jsx` y en la card de pendiente: badge de antigüedad ("🕐 12 días sin movimiento") en amarillo a partir de 7 días y rojo parpadeante a partir de 30, mismo patrón visual del badge rojo de Proyectos.
- Botón "📸 Solicitar evidencia" en la vista detalle (solo administrador/superadmin) y aviso destacado en la vista de campo cuando su pendiente tiene evidencia solicitada.
- Ordenar por defecto los pendientes por días sin movimiento descendente en la vista admin.

Tests mínimos: escalamiento a nivel 1 y 2 por antigüedad, no se puede cerrar un pendiente con `requiere_evidencia` sin foto de cierre, solicitar evidencia por campo devuelve 403, resumen incluye los nuevos contadores
# CLAUDE.md — RSM Sistema
> Archivo de contexto para agentes de Claude Code. Leer antes de cualquier tarea.

---

## Proyecto

**Nombre:** RSM Sistema — Sistema de Gestión Operativa  
**Cliente:** Reserva Santa Margarita AC  
**Repo:** https://github.com/alsatech/rsm-ai  
**Dev path (Windows/WSL):** `C:\Users\alsad\OneDrive\Desktop\rsmsystem`  
**Desarrollador:** Alfredo Salas Hernández — Software Developer & AI Engineer  

---

## Contexto del negocio

Reserva natural en México con ~15 personas operando. Actualmente toda la operación se gestiona mediante:
- Juntas de voz diarias (7:15 AM) donde se reportan datos hidráulicos verbalmente
- Minutas manuales en Word redactadas por Alberto
- Fotos y notas por WhatsApp
- Hojas de Excel desconectadas por área

**Problema central:** No hay trazabilidad, los datos no están estructurados y múltiples personas dedican horas diarias a consolidar información manualmente.

**Objetivo del sistema:** Cada usuario captura sus datos directamente en su módulo. Alberto genera la minuta del día con un solo clic.

---

## Roles del sistema

El sistema tiene **5 roles** con accesos diferenciados. Nunca mostrar elementos bloqueados — si un usuario no tiene acceso a algo, ese elemento debe estar **completamente oculto**, no deshabilitado.

| Rol | Acceso general |
|-----|---------------|
| `Campo` | Solo captura de datos hidráulicos, ganado y flota |
| `Inventario` | Módulo de inventarios + auditoría |
| `Operaciones` | Proyectos, compras, flota, contratistas |
| `Administrador` | Todo excepto nómina y finanzas |
| `Superadmin` | Acceso total al sistema |

---

## Usuarios reales y Job Description

### 👤 Alberto Lebrija — rol: `Superadmin`
**Cargo:** Director / Administrador General de la Reserva  
**Responsabilidades:**
- Conduce la junta diaria de las 7:15 AM
- Genera y redacta la minuta diaria (actualmente en Word, manualmente)
- Da seguimiento a todos los pendientes marcados en amarillo (administración)
- Supervisión general de todas las áreas
- Elaboración de contratos

**Lo que el sistema le resuelve:** Dejar de escribir la minuta a mano. Un clic genera el documento con todo lo que el equipo capturó durante el día.

**Módulos:** Todos. Es el único con vista completa del sistema.

---

### 👤 Alexia Lebrija — rol: `Administrador`
**Cargo:** Administradora de Pagos y Nómina  
**Responsabilidades:**
- Nómina quincenal de todos los trabajadores
- Pagos a proveedores y gestión de gastos
- Concentrado mensual de pagos para la contadora
- Control semanal de gastos de Erik Yepez (con facturas y comprobantes)
- Registro y seguimiento de préstamos a trabajadores con descuentos quincenales

**Lo que el sistema le resuelve:** Reemplazar el Excel de préstamos y el concentrado manual de pagos por módulos estructurados con historial.

**Módulos:** Personal (nómina, préstamos), Facturación, reportes financieros.

---

### 👤 Yajaira — rol: `Inventario`
**Cargo:** Encargada de Inventarios y Control de Materiales  
**Responsabilidades:**
- Compra y control de inventarios: material, alimento para ganado, herramienta, alimento personal
- Actualiza el inventario diariamente entre 4:30–5:00 PM en base a lo que reportan desde campo
- Seguimiento a compras para inventariarlas
- Relación de gastos de equipos
- Auditoría del inventario
- Coordinación con: Sra. Minerva (CDMX), Sr. Erik Yepez, Abigail, Efraín (Chilo)
- Chuy hace traslado de material; contratistas externos también trasladan

**Lo que el sistema le resuelve:** Eliminar la actualización manual. Poder auditar inventario en tiempo real sin Excel.

**Módulos:** Inventarios (captura, auditoría, historial de movimientos, alertas de stock mínimo).

---

### 👤 Abigail — rol: `Administrador`
**Cargo:** Analista de Operaciones / Reportes  
**Responsabilidades:**
- Reporte del sistema hidráulico: verifica cada foto recibida, calcula manómetros y fluxómetros, registra en Excel
- Revisión de fotos de vehículos recibidas por WhatsApp: gasolina, estado físico, chofer, km salida/llegada, niveles de aceite y anticongelante, presión de llantas, filtro de aire
- Pasa toda esa info de fotos a Excel manualmente

**Necesidades específicas:**
- Fecha del acontecimiento en cada reporte (accidentes, fallas)
- Alertas automáticas para cambios de aceite, calibraciones y mantenimiento general

**Lo que el sistema le resuelve:** Eliminar el vaciado manual a Excel. Los datos llegan estructurados directamente desde campo.

**Módulos:** Hidráulica (lectura y validación), Flota (revisión de reportes, alertas de mantenimiento).

---

### 👤 Erik Yepez — rol: `Operaciones`
**Cargo:** Encargado de Compras, Proyectos y Vehículos  
**Responsabilidades:**
- Encargado de compras: cotiza, compra material, manda facturas a Yajaira
- Coordina con contratistas externos
- Encargado de proyectos: da de alta proyectos desde cero (nombre, descripción, material, insumos, compras, contratistas, proveedores)
- Visita frecuente a la reserva — conoce todo lo que pasa en el rancho
- Seguimiento a proyectos activos
- Notificaciones de tenencia y predial

**Lo que el sistema le resuelve:** Un módulo de proyectos propio donde él da de alta, gestiona y da seguimiento sin depender de la minuta o WhatsApp.

**Módulos:** Proyectos (owner total), Compras, Flota (vehículos), notificaciones fiscales.

---

### 👤 Minerva — rol: `Superadmin`
**Cargo:** Supervisora General (basada en CDMX)  
**Responsabilidades:**
- Supervisión y seguimiento de todas las actividades de la reserva
- Participa en el comité diario
- Da seguimiento a pendientes marcados en amarillo (administración)
- Propuso buzón de sugerencias (por confirmar con Ing. Ramón)

**Lo que el sistema le resuelve:** Vista ejecutiva del estado de la reserva sin necesidad de estar presente. Dashboard con estado de todos los módulos.

**Módulos:** Vista de solo lectura de todos los módulos + pendientes + minuta generada.

---

### 👤 Personal de campo — rol: `Campo`
**Usuarios:** Chino, Chilo (Efraín), Cristo, JH, Beto, Luis Eduardo, La Uva  
**Responsabilidades:**
- Mediciones hidráulicas diarias (pilas, fluxómetros, manómetros, bebederos, pluviómetros)
- Recorridos y monitoreo del ganado
- Checklist de vehículos al salir y llegar
- Reportes de campo con fotos

**Lo que el sistema les resuelve:** Capturar en 2 minutos lo que hoy reportan en 45 minutos de junta de voz.

**Módulos:** Hidráulica, Ganado (recorridos), Flota (checklist entrada/salida).

---

## Módulos y ownership por usuario

| # | Módulo | Owner principal | Fase |
|---|--------|----------------|------|
| 1 | Login y roles | — | Mes 1 |
| 2 | Hidráulica y pluviómetros | Campo → Abigail valida | Mes 1 |
| 3 | Pendientes rastreables | Alberto / Minerva | Mes 1 |
| 4 | Ganado — recorridos GPS | Campo | Mes 2 |
| 5 | Flota vehicular | Campo captura → Abigail valida → Erik supervisa | Mes 2 |
| 6 | Inventarios | Yajaira | Mes 2 |
| 7 | Registro de ganado por arete | Campo + Abigail | Mes 2 |
| 8 | Sanidad animal | Campo + Abigail | Mes 3 |
| 9 | Personal (nómina, préstamos) | Alexia | Mes 3 |
| 10 | Minuta automática | Alberto (genera) | Mes 3 |
| 11 | Facturación | Alexia + Erik | Mes 3 |
| 12 | Proyectos | Erik (owner total) | Mes 3 |

> Nota: Se agrega Módulo 12 — Proyectos por el JD de Erik Yepez. Actualizar SLA en próxima junta.

---

## Stack técnico

### Backend
- **Framework:** Django + Django REST Framework
- **Base de datos:** PostgreSQL
- **Autenticación:** Django auth + JWT (djangorestframework-simplejwt)
- **Task queue:** Celery + Redis (alertas de mantenimiento, notificaciones)
- **Deploy:** VPS Hostinger KVM2 — Ubuntu, Gunicorn + systemctl + Nginx

### Frontend
- **Framework:** React (Vite)
- **Estilos:** Tailwind CSS
- **Mapas:** Leaflet + OpenStreetMap / Google Maps API (módulo Ganado)
- **Estado:** useState / useReducer
- **HTTP:** Axios

### Dev environment
- **OS:** Windows con WSL (Ubuntu)
- **Terminal:** WSL + Git Bash
- **Agente:** Claude Code
- **Control de versiones:** Git → GitHub (alsatech/rsm-ai)

---

## Estructura del proyecto

```
rsm-ai/
├── CLAUDE.md
├── AGENTS.md
├── PROGRESS.md
├── CHANGELOG.md
├── .env.example
├── backend/
│   ├── config/            ← settings, urls, wsgi
│   ├── apps/
│   │   ├── users/         ← auth, roles, perfiles
│   │   ├── hidraulica/
│   │   ├── pendientes/
│   │   ├── ganado/
│   │   ├── flota/
│   │   ├── inventario/
│   │   ├── sanidad/
│   │   ├── personal/
│   │   ├── minuta/
│   │   ├── facturacion/
│   │   └── proyectos/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── api/
│   └── package.json
└── docker-compose.yml
```

---

## Convención de commits

```
[MÓDULO] acción: descripción breve

Ejemplos:
[LOGIN] feat: autenticación JWT con 5 roles
[HIDRÁULICA] feat: captura de pilas, fluxómetros y manómetros
[FLOTA] feat: alertas automáticas de mantenimiento con Celery
[INVENTARIO] fix: corrección en cálculo de stock mínimo
[PROYECTOS] feat: módulo completo de gestión de proyectos Erik
```

**Un push por módulo completado.**

---

## Reglas para los agentes

1. **Respetar el SLA** — 12 módulos definidos. No agregar features extra sin indicación de Alfredo.
2. **Mobile first** — campo usa celular. Botones grandes, formularios simples, pocos pasos.
3. **Roles estrictos** — verificar siempre permisos por rol antes de mostrar cualquier elemento.
4. **Elementos restringidos = ocultos**, nunca deshabilitados ni con candado visible.
5. **Español mexicano** en toda la UI — labels, errores, toasts, placeholders.
6. **Dark theme** — fondo `#0a0f0d`, acento `#1f6b3e`, highlight `#4ade80`, fuente DM Sans.
7. **Actualizar PROGRESS.md** en cada push de módulo.
8. **No hardcodear credenciales** — todo en `.env`.
9. **Un app Django por módulo** — mantener apps desacopladas.
10. **Tests mínimos** — modelo + endpoint por módulo antes del push.
11. **No modificar módulos ya completados** sin instrucción explícita.
12. **Alertas con Celery** — cambios de aceite, calibraciones y mantenimiento van por task queue, no inline.

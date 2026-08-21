# Monitoreo de Tanque — Dashboard IoT con ESP8266

Sistema completo de monitoreo en tiempo real de **un tanque de agua** equipado
con **dos sensores digitales de nivel** (`LOW` y `HIGH`) conectados a una placa
**ESP8266**.

El sistema funciona **hoy, sin hardware**: incluye un simulador que reemplaza a
la placa. Cuando llegue el ESP8266 real, basta con configurar el WiFi y apuntar
la placa al endpoint existente — **no hay que reprogramar el frontend**.

---

## Tabla de contenidos

1. [Qué hace el sistema](#1-qué-hace-el-sistema)
2. [Arquitectura](#2-arquitectura)
3. [Instalación](#3-instalación)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Base de datos](#5-base-de-datos)
6. [Ejecutar el dashboard](#6-ejecutar-el-dashboard)
7. [Ejecutar el Mock ESP8266](#7-ejecutar-el-mock-esp8266)
8. [Probar cada estado](#8-probar-cada-estado)
9. [API](#9-api)
10. [Formato esperado del ESP8266](#10-formato-esperado-del-esp8266)
11. [Conectar el ESP8266 real](#11-conectar-el-esp8266-real)
12. [Configurar los sensores](#12-configurar-los-sensores)
13. [Cambiar el timeout de comunicación](#13-cambiar-el-timeout-de-comunicación)
14. [Testing](#14-testing)
15. [Estructura del código](#15-estructura-del-código)

---

## 1. Qué hace el sistema

El sistema **no mide un porcentaje ni un volumen**. Solo conoce el estado de dos
sensores digitales, y de su combinación deriva exactamente cuatro estados:

| `LOW`  | `HIGH` | Estado    | Significado |
|--------|--------|-----------|-------------|
| OFF    | OFF    | 🔴 **NIVEL BAJO** | El agua está por debajo del sensor LOW. |
| ON     | OFF    | 🟡 **NIVEL MEDIO** | El agua alcanzó LOW pero todavía no HIGH. |
| ON     | ON     | 🟢 **TANQUE LLENO** | El agua alcanzó ambos sensores. |
| OFF    | ON     | 🚨 **ANOMALÍA DE SENSOR** | Combinación físicamente imposible. |

> **Sobre el sobrellenado.** Con dos sensores **no existe información suficiente**
> para afirmar que el tanque está sobrellenado por encima de `HIGH`. Por eso
> `HIGH = true` significa **TANQUE LLENO** y nunca "sobrellenado". Detectarlo
> requeriría un tercer sensor `OVERFLOW`, que **no está implementado**.

El dashboard muestra:

- 💧 Estado actual del tanque y representación visual del nivel.
- 📡 Estado de cada sensor (`ACTIVO` / `INACTIVO`), actualizado al instante.
- 🔌 Estado de comunicación del ESP8266 y tiempo desde la última lectura.
- ⚠️ Panel de alertas activas, con reconocer / resolver / filtrar.
- 📊 Historial: gráfico escalonado de estados y tabla `Hora | LOW | HIGH | Estado`.

---

## 2. Arquitectura

**Producción (con hardware):**

```
ESP8266 → REST API → Backend → PostgreSQL
                        ↓
                  SSE (realtime) → Dashboard
```

**Desarrollo (sin hardware):**

```
Mock ESP8266 → REST API → Backend → PostgreSQL
                             ↓
                       SSE (realtime) → Dashboard
```

El **frontend nunca se comunica con el ESP8266**. Solo consume el backend, y lo
hace a través de un único hook (`useTankRealtime`) que encapsula el transporte.

### Decisiones de diseño

| Decisión | Motivo |
|---|---|
| **SSE** en vez de WebSockets | El flujo es unidireccional (servidor → navegador), reconecta solo y no requiere infraestructura extra. El hook degrada a *polling* si SSE falla. |
| **Lógica de estados centralizada** en `TankStateService` | Ningún componente React contiene condiciones sobre `low`/`high`. |
| **Repositorios con dos implementaciones** | PostgreSQL en producción; almacén en memoria si falta `DATABASE_URL`, para que el sistema arranque igualmente. |
| **`OFFLINE` derivado, no persistido por un cron** | Se calcula desde `lastSeen` en cada consulta, así es correcto aunque el proceso se reinicie. |
| **Una alerta abierta por tipo** | Índice único parcial en la base de datos; evita inundar el panel mientras la condición persiste. |

---

## 3. Instalación

Requisitos: **Node.js 20+**, **npm** y **Docker** (o un PostgreSQL propio).

```bash
git clone <repo> && cd Monitoreo-Tanque
npm install
cp .env.example .env.local
```

---

## 4. Variables de entorno

Todas viven en `.env.local` (nunca en el código). Plantilla completa en
[`.env.example`](.env.example).

| Variable | Por defecto | Descripción |
|---|---|---|
| `DATABASE_URL` | — | Conexión a PostgreSQL. Si se omite, se usa un almacén **en memoria** (los datos se pierden al reiniciar). |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | URL base; la usa el simulador por CLI. |
| `DEVICE_ID` | `ESP8266-TANQUE-001` | Identificador lógico del dispositivo. Debe coincidir con el que envía la placa. |
| `DEVICE_NAME` | `ESP8266 Tanque Principal` | Nombre legible del dispositivo. |
| `DEVICE_TIMEOUT_SECONDS` | `60` | Segundos sin lecturas tras los cuales se marca **OFFLINE**. |
| `TANK_NAME` | `Tanque Principal` | Nombre del tanque. |
| `LOW_LEVEL_CRITICAL_MINUTES` | `15` | Minutos en NIVEL BAJO tras los cuales la alerta escala a `CRITICAL`. |
| `MOCK_ESP8266_ENABLED` | `true` en desarrollo | Habilita `/api/mock` y el panel del simulador. |
| `MOCK_ESP8266_INTERVAL_MS` | `5000` | Intervalo del simulador automático. |
| `SENSOR_LOW_ACTIVE_LOW` | `false` | Polaridad del sensor LOW (ver [§12](#12-configurar-los-sensores)). |
| `SENSOR_HIGH_ACTIVE_LOW` | `false` | Polaridad del sensor HIGH. |

La configuración efectiva se puede consultar en la página **`/settings`**.

---

## 5. Base de datos

### Levantar PostgreSQL con Docker

```bash
npm run db:up      # crea el contenedor en el puerto 5434
npm run db:start   # arranca uno ya creado
npm run db:stop    # lo detiene
```

Con eso, `DATABASE_URL=postgresql://tanque:tanque@localhost:5434/tanque`.

### Aplicar el esquema

```bash
npm run db:migrate   # idempotente
npm run db:reset     # DESTRUCTIVO: borra las tablas y las recrea
```

El servidor también aplica el esquema automáticamente al arrancar, así que
`db:migrate` solo es necesario si quiere prepararlo por adelantado.

### Modelo de datos

```
tanks           id, name, description, created_at, updated_at
devices         id, device_id, name, type, status, last_seen, tank_id, ...
tank_readings   id, tank_id, device_id, low, high, state, timestamp
alerts          id, tank_id, device_id, type, severity, message, status,
                created_at, acknowledged_at, resolved_at
```

Definición completa en [`src/database/schema.sql`](src/database/schema.sql).

---

## 6. Ejecutar el dashboard

```bash
npm run dev
```

Abra <http://localhost:3000>. Rutas disponibles:

- `/` — centro de monitoreo (única pantalla operativa).
- `/settings` — configuración efectiva, solo lectura.

---

## 7. Ejecutar el Mock ESP8266

Hay **dos simuladores** y ambos usan exactamente el mismo payload que la placa real.

### a) Panel interactivo (dentro del dashboard)

Al final de la página `/` hay un panel **SIMULADOR ESP8266** con un botón por
escenario. `Enviar` manda una lectura puntual; `Automático` inicia el envío
periódico; `Desconectar` detiene la comunicación.

### b) Simulador por línea de comandos

Envía peticiones HTTP reales desde fuera del proceso Next.js:

```bash
npm run mock                                    # ciclo de llenado cada 5 s
npm run mock -- --scenario=full                 # mantiene el tanque lleno
npm run mock -- --scenario=anomaly --interval=3000
npm run mock -- --once --scenario=low           # una sola lectura
npm run mock -- --url=http://192.168.1.50:3000  # contra otro servidor
```

Escenarios: `low`, `rising`, `full`, `anomaly`, `offline`, `cycle`.

---

## 8. Probar cada estado

| Estado esperado | Simulador (panel) | `curl` |
|---|---|---|
| 🔴 NIVEL BAJO | `NIVEL BAJO` → Enviar | `{"low":false,"high":false}` |
| 🟡 NIVEL MEDIO | `NIVEL MEDIO` → Enviar | `{"low":true,"high":false}` |
| 🟢 TANQUE LLENO | `TANQUE LLENO` → Enviar | `{"low":true,"high":true}` |
| 🚨 ANOMALÍA | `ANOMALÍA` → Enviar | `{"low":false,"high":true}` |
| 🔌 DISPOSITIVO OFFLINE | `DISPOSITIVO OFFLINE` → Desconectar | dejar de enviar > `DEVICE_TIMEOUT_SECONDS` |

Ejemplo completo:

```bash
curl -X POST http://localhost:3000/api/tank/readings \
  -H 'Content-Type: application/json' \
  -d '{"deviceId":"ESP8266-TANQUE-001","low":true,"high":false}'
# {"success":true,"state":"MEDIUM", ...}
```

Alertas que verá aparecer:

- **NIVEL BAJO** (`WARNING`) al entrar en `LOW`; escala a `CRITICAL` tras
  `LOW_LEVEL_CRITICAL_MINUTES`. Se resuelve sola al subir el nivel.
- **ANOMALÍA DE SENSOR** (`CRITICAL`) mientras `LOW=OFF` y `HIGH=ON`.
- **DISPOSITIVO OFFLINE** (`CRITICAL`) al superar el timeout de comunicación;
  se resuelve sola en cuanto llega una lectura nueva.

---

## 9. API

Todas las respuestas llevan `success: boolean`. Los errores usan
`{ "success": false, "error": "CODIGO" }` con códigos
`INVALID_PAYLOAD`, `UNKNOWN_DEVICE`, `NOT_FOUND`, `DISABLED`, `INTERNAL_ERROR`.

### `POST /api/tank/readings`

Endpoint de ingesta. **Es el único que consume el ESP8266.**

```jsonc
// Request
{ "deviceId": "ESP8266-TANQUE-001", "low": true, "high": false,
  "timestamp": "2026-08-20T19:30:00Z" }   // timestamp opcional
```

```jsonc
// 200 OK
{ "success": true, "state": "MEDIUM",
  "reading": { "id": "...", "low": true, "high": false, "state": "MEDIUM",
               "timestamp": "2026-08-20T19:30:00.000Z" },
  "device": { "status": "ONLINE" }, "activeAlerts": 0 }
```

```jsonc
// 400 Bad Request
{ "success": false, "error": "INVALID_PAYLOAD",
  "details": { "issues": [{ "path": "low", "message": "expected boolean" }] } }
// 404 Not Found  -> deviceId no registrado
{ "success": false, "error": "UNKNOWN_DEVICE" }
```

El backend, en orden: valida el `deviceId` → valida que `low`/`high` sean
booleanos → registra la lectura → actualiza la última comunicación → determina
el estado → detecta anomalías → crea o resuelve alertas → emite el evento
realtime.

### `GET /api/tank`

Vista agregada (lo que el dashboard necesita al arrancar): tanque, estado,
última lectura, dispositivo, alertas activas y hora del servidor.

### `GET /api/tank/latest`

```jsonc
{ "success": true,
  "reading": { "low": true, "high": true, "state": "FULL", "timestamp": "..." },
  "state": { "state": "FULL", "label": "TANQUE LLENO", "emoji": "🟢", ... } }
```

### `GET /api/tank/readings?range=1h|6h|24h|7d&limit=1000`

Historial de lecturas, de la más reciente a la más antigua.

```jsonc
{ "success": true, "range": "1h", "from": "...", "to": "...",
  "count": 42, "readings": [ ... ] }
```

### `GET /api/tank/alerts?status=OPEN|ACTIVE|ACKNOWLEDGED|RESOLVED|ALL&limit=100`

Listado de alertas (por defecto las abiertas).

### `POST /api/tank/alerts/:id/acknowledge`

Marca la alerta como reconocida (sigue abierta). `404` si no existe o no está
en estado `ACTIVE`.

### `POST /api/tank/alerts/:id/resolve`

Cierra la alerta. `404` si no existe o ya estaba resuelta.

### `GET /api/device/status`

Estado de comunicación del ESP8266. Además reconcilia la alerta
`DEVICE_OFFLINE` si se superó el timeout.

```jsonc
{ "success": true,
  "device": { "deviceId": "ESP8266-TANQUE-001", "status": "ONLINE",
              "lastSeen": "...", "secondsSinceLastSeen": 4,
              "timeoutSeconds": 60, "lastLow": true, "lastHigh": true },
  "activeAlerts": [] }
```

### `GET /api/tank/stream`  *(text/event-stream)*

Canal realtime del dashboard. Eventos: `snapshot` (estado completo al conectar),
`reading`, `alerts`, `device`, `heartbeat`.

### `GET|POST /api/mock`  *(solo desarrollo)*

Controla el simulador. `POST { "action": "send|start|stop", "scenario": "full" }`.
Devuelve `403 DISABLED` si `MOCK_ESP8266_ENABLED=false`.

---

## 10. Formato esperado del ESP8266

Los únicos datos que provienen del dispositivo son `deviceId`, `low`, `high` y,
opcionalmente, `timestamp`. **No** se asume ningún sensor de distancia ni de
porcentaje.

```json
{ "deviceId": "ESP8266-TANQUE-001", "low": true,  "high": false, "timestamp": "2026-08-20T19:30:00Z" }
{ "deviceId": "ESP8266-TANQUE-001", "low": true,  "high": true,  "timestamp": "2026-08-20T19:31:00Z" }
{ "deviceId": "ESP8266-TANQUE-001", "low": false, "high": false, "timestamp": "2026-08-20T19:32:00Z" }
```

`low` y `high` son el significado **lógico** (`true` = el agua alcanza ese
sensor). Convertir el nivel eléctrico del pin a ese booleano es responsabilidad
del firmware — el backend nunca depende del cableado.

Si el dispositivo no tiene la hora sincronizada por NTP, puede **omitir**
`timestamp` y el backend usará su hora de recepción.

---

## 11. Conectar el ESP8266 real

El sketch listo para compilar está en
[`firmware/esp8266-tanque/`](firmware/esp8266-tanque/) (ver
[`firmware/README.md`](firmware/README.md)).

1. Conectar a WiFi.
2. Leer el pin del sensor LOW.
3. Leer el pin del sensor HIGH.
4. Convertir ambas lecturas a booleanos lógicos.
5. Construir el JSON.
6. `POST` a `/api/tank/readings`.

En el servidor solo hay que:

```bash
# .env.local
DEVICE_ID=ESP8266-TANQUE-001   # el mismo que el del sketch
MOCK_ESP8266_ENABLED=false     # oculta el panel del simulador
```

**No se modifica ni una línea del frontend.** El dashboard ya consume el mismo
endpoint que usará la placa.

---

## 12. Configurar los sensores

Según cómo estén cableados, los sensores pueden ser:

- **Normally Open** — el sensor está *activo* cuando el pin lee **HIGH**.
- **Normally Closed** — el sensor está *activo* cuando el pin lee **LOW**
  (típico con `INPUT_PULLUP` y un flotador que cierra a GND).

En el **firmware**:

```cpp
const bool SENSOR_LOW_ACTIVE_LOW  = true;   // Normally Closed
const bool SENSOR_HIGH_ACTIVE_LOW = true;
```

En el **backend** (documenta el cableado y queda disponible para futuras
normalizaciones del payload):

```bash
SENSOR_LOW_ACTIVE_LOW=true
SENSOR_HIGH_ACTIVE_LOW=true
```

La conversión es `activo = activeLow ? !pinIsHigh : pinIsHigh`
([`src/config/sensors.ts`](src/config/sensors.ts)). El backend **siempre**
recibe el booleano lógico ya convertido.

---

## 13. Cambiar el timeout de comunicación

```bash
# .env.local
DEVICE_TIMEOUT_SECONDS=120
```

Reinicie el servidor. Si pasan más de esos segundos sin lecturas:

- el header muestra **🔴 ESP8266 OFFLINE**,
- se abre la alerta `DEVICE_OFFLINE` (`CRITICAL`),
- la visualización del tanque se atenúa para indicar que el dato está obsoleto.

Todo se resuelve automáticamente en cuanto llega una lectura nueva. Conviene que
el timeout sea al menos **el doble** del intervalo de envío del firmware
(`SEND_INTERVAL_MS`) para tolerar un envío perdido.

---

## 14. Testing

```bash
npm test              # suite completa
npm run test:watch
npm run test:coverage
npm run typecheck
npm run lint
```

Cobertura de las pruebas:

- **Lógica de estados** — las cuatro combinaciones `LOW`/`HIGH`, y que `FULL`
  nunca se presente como sobrellenado.
- **Validación del payload** — booleanos, `deviceId`, `timestamp` opcional.
- **Creación de alertas** — apertura, no duplicación, escalado a `CRITICAL`,
  resolución automática, reconocer / resolver manualmente.
- **Dispositivo offline** — derivación de `ONLINE`/`OFFLINE`/`UNKNOWN`, límites
  del timeout, apertura y cierre de la alerta.
- **API y pipeline de ingesta** — persistencia, `deviceId` desconocido, uso del
  `timestamp` recibido.
- **Historial** — orden y filtrado por rango.
- **Realtime** — publicación y cancelación de suscripciones.
- **Mock ESP8266** — forma del payload, escenarios, envío automático, parada.
- **Polaridad de sensores** — Normally Open / Normally Closed.

---

## 15. Estructura del código

```
src/
├── app/
│   ├── api/                 Endpoints REST y canal SSE
│   ├── page.tsx             Dashboard (/)
│   └── settings/            Configuración efectiva (/settings)
├── components/
│   ├── dashboard/           Componentes del centro de monitoreo
│   └── ui/                  Primitivas shadcn/ui
├── config/                  Variables de entorno y polaridad de sensores
├── database/                Pool, esquema SQL, migraciones, bootstrap
├── domain/                  Tipos y reglas puras (estados, alertas, dispositivo)
├── hooks/                   useTankRealtime, useTankHistory, useAlerts, ...
├── lib/                     Serializadores, validación (zod), formato, utils
├── mocks/                   MockESP8266, escenarios, runner embebido
├── realtime/                Bus de eventos y contratos de los eventos
├── repositories/            Interfaces + implementaciones PostgreSQL / memoria
├── services/                TankStateService, AlertService, DeviceService,
│                            TankService (orquestación)
└── types/                   Entidades y DTOs compartidos
firmware/                    Sketch del ESP8266
scripts/                     Simulador CLI, migraciones, reset
tests/                       Suite de pruebas (vitest)
```

**Regla de oro:** la lógica de negocio vive en `services/` y `domain/`. Los
componentes React solo consumen DTOs; no contienen condiciones sobre `low`/`high`
ni conocen el mecanismo de tiempo real.

### Preparado para crecer

La interfaz actual está diseñada específicamente para **1 tanque + 1 ESP8266 +
2 sensores** y no incluye rutas de dispositivos, tanques ni usuarios. La
arquitectura interna, en cambio, ya soporta la extensión: las tablas llevan
`tank_id`/`device_id`, los repositorios reciben el tanque como parámetro y el
bus de eventos puede sustituirse por Redis o `LISTEN/NOTIFY` sin tocar el resto
del sistema. Añadir un tercer sensor `OVERFLOW` implicaría un nuevo estado en
`src/domain/tank-state.ts` y su regla en `TankStateService` — nada más.

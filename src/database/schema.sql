-- =====================================================================
-- Monitoreo de Tanque - esquema PostgreSQL
-- Idempotente: puede ejecutarse multiples veces sin efectos secundarios.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- Tanques
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tanks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Dispositivos (ESP8266)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id  TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'ESP8266',
  status     TEXT NOT NULL DEFAULT 'UNKNOWN'
             CHECK (status IN ('ONLINE', 'OFFLINE', 'UNKNOWN')),
  last_seen  TIMESTAMPTZ,
  tank_id    UUID REFERENCES tanks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Lecturas de sensores
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tank_readings (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id   UUID NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  low       BOOLEAN NOT NULL,
  high      BOOLEAN NOT NULL,
  state     TEXT NOT NULL CHECK (state IN ('LOW', 'MEDIUM', 'FULL', 'ANOMALY')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tank_readings_tank_ts
  ON tank_readings (tank_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_tank_readings_device_ts
  ON tank_readings (device_id, timestamp DESC);

-- ---------------------------------------------------------------------
-- Alertas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id         UUID NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
  device_id       TEXT,
  type            TEXT NOT NULL
                  CHECK (type IN ('LOW_LEVEL', 'SENSOR_INCONSISTENCY', 'DEVICE_OFFLINE')),
  severity        TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  message         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_tank_created
  ON alerts (tank_id, created_at DESC);

-- Una unica alerta abierta por tanque y tipo: evita inundar el panel con
-- duplicados mientras la condicion sigue presente.
CREATE UNIQUE INDEX IF NOT EXISTS uq_alerts_open_per_type
  ON alerts (tank_id, type)
  WHERE status <> 'RESOLVED';

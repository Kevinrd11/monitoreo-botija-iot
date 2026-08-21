import { query, queryOne } from "@/database/pool";
import type { DeviceRepository } from "@/repositories/types";
import { type DeviceRow, toDevice } from "./mappers";

const COLUMNS =
  "id, device_id, name, type, status, last_seen, created_at, updated_at";

export const postgresDeviceRepository: DeviceRepository = {
  async findByDeviceId(deviceId) {
    const row = await queryOne<DeviceRow>(
      `SELECT ${COLUMNS} FROM devices WHERE device_id = $1`,
      [deviceId],
    );
    return row ? toDevice(row) : null;
  },

  async ensure({ deviceId, name, type = "ESP8266", tankId = null }) {
    const rows = await query<DeviceRow>(
      `INSERT INTO devices (device_id, name, type, tank_id)
            VALUES ($1, $2, $3, $4)
       ON CONFLICT (device_id) DO UPDATE
              SET name = EXCLUDED.name,
                  tank_id = COALESCE(devices.tank_id, EXCLUDED.tank_id),
                  updated_at = now()
        RETURNING ${COLUMNS}`,
      [deviceId, name, type, tankId],
    );
    return toDevice(rows[0]);
  },

  async touch(deviceId, lastSeen) {
    const row = await queryOne<DeviceRow>(
      `UPDATE devices
          SET last_seen = $2, status = 'ONLINE', updated_at = now()
        WHERE device_id = $1
        RETURNING ${COLUMNS}`,
      [deviceId, lastSeen],
    );
    return row ? toDevice(row) : null;
  },

  async updateStatus(deviceId, status) {
    const row = await queryOne<DeviceRow>(
      `UPDATE devices SET status = $2, updated_at = now()
        WHERE device_id = $1 RETURNING ${COLUMNS}`,
      [deviceId, status],
    );
    return row ? toDevice(row) : null;
  },

  async listAll() {
    const rows = await query<DeviceRow>(
      `SELECT ${COLUMNS} FROM devices ORDER BY created_at ASC`,
    );
    return rows.map(toDevice);
  },
};

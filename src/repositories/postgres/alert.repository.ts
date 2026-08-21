import { query, queryOne } from "@/database/pool";
import type { AlertRepository } from "@/repositories/types";
import { type AlertRow, toAlert } from "./mappers";

const COLUMNS =
  "id, tank_id, device_id, type, severity, message, status, created_at, acknowledged_at, resolved_at";

export const postgresAlertRepository: AlertRepository = {
  async create(input) {
    const rows = await query<AlertRow>(
      `INSERT INTO alerts (tank_id, device_id, type, severity, message)
            VALUES ($1, $2, $3, $4, $5)
        RETURNING ${COLUMNS}`,
      [input.tankId, input.deviceId, input.type, input.severity, input.message],
    );
    return toAlert(rows[0]);
  },

  async findById(id) {
    const row = await queryOne<AlertRow>(`SELECT ${COLUMNS} FROM alerts WHERE id = $1`, [id]);
    return row ? toAlert(row) : null;
  },

  async find({ tankId, status, type, limit = 100, offset = 0 }) {
    const openOnly = status === "OPEN";
    const exactStatus = openOnly ? null : (status ?? null);

    const rows = await query<AlertRow>(
      `SELECT ${COLUMNS} FROM alerts
        WHERE tank_id = $1
          AND ($2::boolean IS FALSE OR status <> 'RESOLVED')
          AND ($3::text IS NULL OR status = $3)
          AND ($4::text IS NULL OR type = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6`,
      [tankId, openOnly, exactStatus, type ?? null, limit, offset],
    );
    return rows.map(toAlert);
  },

  async findOpenByType(tankId, type) {
    const row = await queryOne<AlertRow>(
      `SELECT ${COLUMNS} FROM alerts
        WHERE tank_id = $1 AND type = $2 AND status <> 'RESOLVED'
        ORDER BY created_at DESC
        LIMIT 1`,
      [tankId, type],
    );
    return row ? toAlert(row) : null;
  },

  async acknowledge(id, at) {
    const row = await queryOne<AlertRow>(
      `UPDATE alerts
          SET status = 'ACKNOWLEDGED', acknowledged_at = COALESCE(acknowledged_at, $2)
        WHERE id = $1 AND status = 'ACTIVE'
        RETURNING ${COLUMNS}`,
      [id, at],
    );
    return row ? toAlert(row) : null;
  },

  async resolve(id, at) {
    const row = await queryOne<AlertRow>(
      `UPDATE alerts
          SET status = 'RESOLVED', resolved_at = COALESCE(resolved_at, $2)
        WHERE id = $1 AND status <> 'RESOLVED'
        RETURNING ${COLUMNS}`,
      [id, at],
    );
    return row ? toAlert(row) : null;
  },

  async resolveOpenByType(tankId, type, at) {
    const rows = await query<AlertRow>(
      `UPDATE alerts
          SET status = 'RESOLVED', resolved_at = COALESCE(resolved_at, $3)
        WHERE tank_id = $1 AND type = $2 AND status <> 'RESOLVED'
        RETURNING ${COLUMNS}`,
      [tankId, type, at],
    );
    return rows.map(toAlert);
  },

  async escalate(id, severity, message) {
    const row = await queryOne<AlertRow>(
      `UPDATE alerts SET severity = $2, message = $3
        WHERE id = $1 AND status <> 'RESOLVED'
        RETURNING ${COLUMNS}`,
      [id, severity, message],
    );
    return row ? toAlert(row) : null;
  },
};

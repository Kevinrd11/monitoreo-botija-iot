import { query, queryOne } from "@/database/pool";
import type { TankState } from "@/domain/tank-state";
import type { ReadingRepository } from "@/repositories/types";
import { type ReadingRow, toReading } from "./mappers";

const COLUMNS = "id, tank_id, device_id, low, high, state, timestamp";

export const postgresReadingRepository: ReadingRepository = {
  async create(input) {
    const rows = await query<ReadingRow>(
      `INSERT INTO tank_readings (tank_id, device_id, low, high, state, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING ${COLUMNS}`,
      [input.tankId, input.deviceId, input.low, input.high, input.state, input.timestamp],
    );
    return toReading(rows[0]);
  },

  async findLatest(tankId) {
    const row = await queryOne<ReadingRow>(
      `SELECT ${COLUMNS} FROM tank_readings
        WHERE tank_id = $1
        ORDER BY timestamp DESC, id DESC
        LIMIT 1`,
      [tankId],
    );
    return row ? toReading(row) : null;
  },

  async find({ tankId, from, to, limit = 200, offset = 0 }) {
    const rows = await query<ReadingRow>(
      `SELECT ${COLUMNS} FROM tank_readings
        WHERE tank_id = $1
          AND ($2::timestamptz IS NULL OR timestamp >= $2)
          AND ($3::timestamptz IS NULL OR timestamp <= $3)
        ORDER BY timestamp DESC, id DESC
        LIMIT $4 OFFSET $5`,
      [tankId, from ?? null, to ?? null, limit, offset],
    );
    return rows.map(toReading);
  },

  async count({ tankId, from, to }) {
    const row = await queryOne<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM tank_readings
        WHERE tank_id = $1
          AND ($2::timestamptz IS NULL OR timestamp >= $2)
          AND ($3::timestamptz IS NULL OR timestamp <= $3)`,
      [tankId, from ?? null, to ?? null],
    );
    return Number(row?.total ?? 0);
  },

  async findCurrentStreakStart(tankId, state) {
    const latest = await this.findLatest(tankId);
    if (!latest || latest.state !== state) return null;

    const row = await queryOne<{ started_at: Date | null }>(
      `SELECT MIN(timestamp) AS started_at
         FROM tank_readings
        WHERE tank_id = $1
          AND state = $2
          AND timestamp > COALESCE(
                (SELECT MAX(timestamp) FROM tank_readings
                  WHERE tank_id = $1 AND state <> $2),
                '-infinity'::timestamptz)`,
      [tankId, state],
    );
    return row?.started_at ?? null;
  },

  async findPreviousDistinctState(tankId, state) {
    const row = await queryOne<{ state: string }>(
      `SELECT state FROM tank_readings
        WHERE tank_id = $1 AND state <> $2
        ORDER BY timestamp DESC, id DESC
        LIMIT 1`,
      [tankId, state],
    );
    return (row?.state as TankState) ?? null;
  },

  async findLastOccurrence(tankId, state) {
    const row = await queryOne<{ timestamp: Date }>(
      `SELECT timestamp FROM tank_readings
        WHERE tank_id = $1 AND state = $2
        ORDER BY timestamp DESC, id DESC
        LIMIT 1`,
      [tankId, state],
    );
    return row?.timestamp ?? null;
  },
};

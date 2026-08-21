import { query, queryOne } from "@/database/pool";
import type { TankRepository } from "@/repositories/types";
import type { Tank } from "@/types";
import { type TankRow, toTank } from "./mappers";

const COLUMNS = "id, name, description, created_at, updated_at";

export const postgresTankRepository: TankRepository = {
  async findById(id) {
    const row = await queryOne<TankRow>(`SELECT ${COLUMNS} FROM tanks WHERE id = $1`, [id]);
    return row ? toTank(row) : null;
  },

  async findFirst() {
    const row = await queryOne<TankRow>(
      `SELECT ${COLUMNS} FROM tanks ORDER BY created_at ASC LIMIT 1`,
    );
    return row ? toTank(row) : null;
  },

  async create({ name, description = null }) {
    const rows = await query<TankRow>(
      `INSERT INTO tanks (name, description) VALUES ($1, $2) RETURNING ${COLUMNS}`,
      [name, description],
    );
    return toTank(rows[0]);
  },

  async ensureDefault(name, description = null): Promise<Tank> {
    const existing = await this.findFirst();
    if (existing) return existing;
    return this.create({ name, description });
  },
};

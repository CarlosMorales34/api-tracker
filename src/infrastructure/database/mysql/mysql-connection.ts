import mysql, { Pool } from 'mysql2/promise';
import { env } from '../../config/env';

let pool: Pool | undefined;

export function getMysqlPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

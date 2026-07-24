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
      connectionLimit: env.db.poolLimit,
      // Los módulos financieros/peso/registro semanal usan columnas DECIMAL;
      // sin esto mysql2 las devuelve como string y hay que parsear a mano en
      // cada repositorio. Ninguna tabla existente antes de estos módulos usaba
      // DECIMAL (metric_entries.value es DOUBLE), así que no cambia nada del
      // comportamiento previo.
      decimalNumbers: true,
      // Columnas DATE (week_start_date, expense_date, log_date, etc.) vuelven
      // como string 'YYYY-MM-DD' tal cual, en vez de un objeto Date en el
      // timezone local del proceso — evita bugs de +/-1 día al convertir. Solo
      // afecta DATE, no DATETIME (created_at/updated_at siguen como Date, sin
      // cambiar el comportamiento de los repositorios ya existentes).
      dateStrings: ['DATE'],
    });
  }
  return pool;
}

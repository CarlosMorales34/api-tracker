export interface ProductivitySettings {
  weeklyTargetHours: number;
}

// Mismo default que la columna `weekly_target_hours` en
// sql/013_create_weekly_log_tables.sql (DEFAULT 112) para cuando el usuario
// no tiene fila todavía — no hay endpoint de escritura en este contrato, solo
// se usa internamente para el cálculo de `percent`.
export const DEFAULT_PRODUCTIVITY_SETTINGS: ProductivitySettings = { weeklyTargetHours: 112 };

export interface FixedExpenseChargeRepository {
  // Crea el cargo de esa ocurrencia puntual solo si no existía -- atómico
  // (INSERT ON DUPLICATE KEY, no exists()+create() separados) para no
  // ajustar la cartera dos veces ante requests concurrentes. Devuelve true
  // solo si fue un insert nuevo (así el caller sabe si debe ajustar el saldo).
  createIfNotExists(fixedExpenseId: string, chargeDate: string, amount: number): Promise<boolean>;
}

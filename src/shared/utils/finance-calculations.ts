// Funciones puras (sin I/O) para los indicadores de Finanzas -- separadas de
// los use-cases a propósito, mismo criterio que body-progress-calculations.ts,
// para poder probarlas sin mockear repos.

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Patrimonio neto = liquidez - deuda total. A propósito NO suma crédito
// disponible: el crédito es capacidad de endeudarte, no dinero propio.
export function netWorth(walletBalance: number, debtTotal: number): number {
  return round2(walletBalance - debtTotal);
}

export function creditAvailable(creditLimit: number, amountOwed: number): number {
  return round2(creditLimit - amountOwed);
}

// null = sin presupuesto asignado ese mes -- "restante" no es 0, es "no
// calculable" (el llamador debe distinguir esto de un presupuesto real de $0).
export function budgetRemaining(budgetAmount: number, monthExpenseTotal: number): number {
  return round2(budgetAmount - monthExpenseTotal);
}

export function budgetPercentUsed(budgetAmount: number, monthExpenseTotal: number): number | null {
  if (budgetAmount <= 0) return null;
  return Math.round((monthExpenseTotal / budgetAmount) * 100);
}

export interface WeeklyFlow {
  income: number;
  expense: number;
}

export function weeklyBalance(flow: WeeklyFlow): number {
  return round2(flow.income - flow.expense);
}

// Ahorro neto = suma acumulada de (ingresos - gastos reales) por semana --
// calculado, no un log manual. Negativo si el usuario gastó más de lo que
// ingresó en el acumulado.
export function accumulatedSavings(flows: WeeklyFlow[]): number {
  return round2(flows.reduce((total, flow) => total + (flow.income - flow.expense), 0));
}

// Mismo cálculo que ya usaba ListFinanceAnnualIncomeUseCase, extraído acá
// para poder probarlo sin mockear repos. null = año anterior ausente o en 0
// (no se puede calcular un % de crecimiento contra nada).
export function annualGrowthPercent(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

export interface UpdateFixedMonthlyExpenseDto {
  name?: string;
  amount?: number;
  dayOfMonth?: number | null;
  description?: string | null;
}

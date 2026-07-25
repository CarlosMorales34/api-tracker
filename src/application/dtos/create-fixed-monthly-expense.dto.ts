export interface CreateFixedMonthlyExpenseDto {
  name: string;
  amount: number;
  dayOfMonth: number;
  description?: string | null;
}

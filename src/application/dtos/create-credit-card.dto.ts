export interface CreateCreditCardDto {
  name: string;
  creditLimit: number;
  dueDay: number;
  amountOwed?: number;
}

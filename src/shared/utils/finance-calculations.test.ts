import { describe, expect, it } from 'vitest';
import {
  accumulatedSavings,
  annualGrowthPercent,
  budgetPercentUsed,
  budgetRemaining,
  creditAvailable,
  netWorth,
  weeklyBalance,
} from './finance-calculations';

describe('finance-calculations', () => {
  describe('netWorth', () => {
    it('liquidez menos deuda -- NO suma crédito disponible', () => {
      expect(netWorth(10000, 3000)).toBe(7000);
    });
    it('puede ser negativo si la deuda supera la liquidez', () => {
      expect(netWorth(1000, 5000)).toBe(-4000);
    });
  });

  describe('creditAvailable', () => {
    it('límite menos adeudado', () => {
      expect(creditAvailable(30000, 8500)).toBe(21500);
    });
  });

  describe('budgetRemaining / budgetPercentUsed', () => {
    it('restante = presupuesto - gastado', () => {
      expect(budgetRemaining(40578, 18010)).toBe(22568);
    });
    it('% usado redondeado', () => {
      expect(budgetPercentUsed(40578, 18010)).toBe(44);
    });
    it('% usado es null si el presupuesto es 0 (no calculable, no div/0)', () => {
      expect(budgetPercentUsed(0, 500)).toBeNull();
    });
  });

  describe('weeklyBalance', () => {
    it('ingresos menos gastos', () => {
      expect(weeklyBalance({ income: 12500, expense: 3200 })).toBe(9300);
    });
    it('negativo si se gastó más de lo que ingresó', () => {
      expect(weeklyBalance({ income: 0, expense: 3200 })).toBe(-3200);
    });
  });

  describe('accumulatedSavings', () => {
    it('suma (ingreso - gasto) de cada semana', () => {
      expect(
        accumulatedSavings([
          { income: 1000, expense: 400 },
          { income: 1200, expense: 900 },
          { income: 0, expense: 200 },
        ]),
      ).toBe(700); // 600 + 300 - 200
    });
    it('array vacío = 0, no NaN ni error', () => {
      expect(accumulatedSavings([])).toBe(0);
    });
  });

  describe('annualGrowthPercent', () => {
    it('crecimiento positivo', () => {
      expect(annualGrowthPercent(120000, 100000)).toBe(20);
    });
    it('crecimiento negativo', () => {
      expect(annualGrowthPercent(80000, 100000)).toBe(-20);
    });
    it('null si no hay año anterior', () => {
      expect(annualGrowthPercent(50000, null)).toBeNull();
    });
    it('null si el año anterior fue 0 (evita división entre 0)', () => {
      expect(annualGrowthPercent(50000, 0)).toBeNull();
    });
  });
});

import { Pool, RowDataPacket } from 'mysql2/promise';
import { CreditCard } from '../../../../domain/entities/credit-card.entity';
import { CreditCardRepository } from '../../../../domain/repositories/credit-card.repository';

interface CreditCardRow extends RowDataPacket {
  id: string;
  user_id: string;
  name: string;
  credit_limit: number;
  due_day: number;
  amount_owed: number;
}

export class MysqlCreditCardRepository implements CreditCardRepository {
  constructor(private readonly pool: Pool) {}

  async save(card: CreditCard): Promise<void> {
    await this.pool.query(
      'INSERT INTO credit_cards (id, user_id, name, credit_limit, due_day, amount_owed) VALUES (?, ?, ?, ?, ?, ?)',
      [card.id, card.userId, card.name, card.creditLimit, card.dueDay, card.amountOwed],
    );
  }

  async update(card: CreditCard): Promise<void> {
    await this.pool.query(
      'UPDATE credit_cards SET name = ?, credit_limit = ?, due_day = ?, amount_owed = ? WHERE id = ?',
      [card.name, card.creditLimit, card.dueDay, card.amountOwed, card.id],
    );
  }

  async findById(id: string): Promise<CreditCard | null> {
    const [rows] = await this.pool.query<CreditCardRow[]>('SELECT * FROM credit_cards WHERE id = ? LIMIT 1', [id]);
    const [row] = rows;
    return row ? this.toEntity(row) : null;
  }

  async findAllByUserId(userId: string): Promise<CreditCard[]> {
    const [rows] = await this.pool.query<CreditCardRow[]>(
      'SELECT * FROM credit_cards WHERE user_id = ? ORDER BY created_at ASC',
      [userId],
    );
    return rows.map((row) => this.toEntity(row));
  }

  async deleteById(id: string): Promise<void> {
    await this.pool.query('DELETE FROM credit_cards WHERE id = ?', [id]);
  }

  private toEntity(row: CreditCardRow): CreditCard {
    return CreditCard.fromPersistence({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      creditLimit: row.credit_limit,
      dueDay: row.due_day,
      amountOwed: row.amount_owed,
    });
  }
}

import { Pool } from 'pg';
import { BaseRepository, toCamel } from './base-repository';

export interface CustomerRow {
  id: string;
  email: string;
  name: string | null;
  stripeCustomerId: string | null;
  stripeConnectAccountId: string | null;
  type: 'customer' | 'investor' | 'admin';
  passwordHash: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CustomerRepository extends BaseRepository<CustomerRow> {
  constructor(pool: Pool) {
    super(pool, 'customers');
  }

  async findByEmail(email: string): Promise<CustomerRow | null> {
    const result = await this.pool.query('SELECT * FROM customers WHERE email = $1', [email]);
    return result.rows[0] ? toCamel<CustomerRow>(result.rows[0]) : null;
  }

  async findByStripeId(stripeCustomerId: string): Promise<CustomerRow | null> {
    const result = await this.pool.query('SELECT * FROM customers WHERE stripe_customer_id = $1', [stripeCustomerId]);
    return result.rows[0] ? toCamel<CustomerRow>(result.rows[0]) : null;
  }
}

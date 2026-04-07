/**
 * Customer types.
 */

export type CustomerType = 'customer' | 'investor' | 'admin';

export interface Customer {
  id: string;
  email: string;
  name: string;
  stripeCustomerId?: string;
  type: CustomerType;
  createdAt: Date;
  updatedAt: Date;
}

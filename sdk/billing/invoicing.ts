/**
 * Consolidated invoicing -- combines domain, email, and auction charges.
 */

import { Invoice, InvoiceLineItem, BillingTransactionType } from '../types/billing';

export interface InvoicingConfig {
  stripeSecretKey: string;
}

/**
 * Generate a consolidated monthly invoice for a customer.
 */
export function buildInvoice(
  customerId: string,
  lineItems: InvoiceLineItem[],
  periodStart: Date,
  periodEnd: Date
): Invoice {
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount * item.quantity, 0);

  return {
    id: `inv_${Date.now()}`,
    customerId,
    lineItems,
    subtotal,
    total: subtotal,
    currency: 'USD',
    status: 'draft',
    periodStart,
    periodEnd,
    createdAt: new Date(),
  };
}

/**
 * Send invoice via Stripe.
 */
export async function sendInvoice(
  config: InvoicingConfig,
  invoice: Invoice
): Promise<{ stripeInvoiceId: string; success: boolean }> {
  // TODO: Implement with Stripe SDK
  // const stripe = new Stripe(config.stripeSecretKey);
  // const stripeInvoice = await stripe.invoices.create({
  //   customer: invoice.customerId,
  //   auto_advance: true,
  // });
  // for (const item of invoice.lineItems) {
  //   await stripe.invoiceItems.create({
  //     customer: invoice.customerId,
  //     invoice: stripeInvoice.id,
  //     amount: Math.round(item.amount * item.quantity * 100),
  //     currency: 'usd',
  //     description: item.description,
  //   });
  // }
  // await stripe.invoices.finalizeInvoice(stripeInvoice.id);

  return {
    stripeInvoiceId: `in_${Date.now()}`,
    success: true,
  };
}

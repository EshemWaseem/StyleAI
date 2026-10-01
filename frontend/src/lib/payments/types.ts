// lib/payments/types.ts
export type PaymentProvider = 'STRIPE' | 'JAZZCASH' | 'EASYPAISA' | 'COD' | 'WALLET';
export type PaymentContext = 'SUBSCRIPTION' | 'ORDER' | 'PAYOUT' | 'ESCROW';
export type BillingCycle = 'MONTHLY' | 'YEARLY';

export interface CheckoutSession {
  url: string | null;
  method: 'REDIRECT' | 'FORM_POST' | 'NONE';
  reference?: string;
  fields?: Record<string, string>;
  instructions?: string;
  amount?: number;
  currency?: string;
}
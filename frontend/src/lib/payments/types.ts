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
  orderId?: string;
  paymentId?: string;
}

export interface SubscriptionCheckoutInput {
  planName: string;
  cycle?: BillingCycle;
  provider?: PaymentProvider;
}

export interface OrderCheckoutInput {
  provider: PaymentProvider;

  // Path A: existing order (already created)
  orderId?: string;

  // Path B: create order from cart items in one call
  cartItems?: Array<{ productId: string; quantity: number }>;
  shippingAddress?: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
    notes?: string;
  };
  currency?: string;
}
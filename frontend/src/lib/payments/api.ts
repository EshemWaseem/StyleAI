// lib/payments/api.ts
import { http } from '../api';
import type { PaymentProvider, PaymentContext, CheckoutSession } from './types';

export const paymentsApi = {
  getMethods: (context: PaymentContext) =>
    http.get<{ context: string; providers: PaymentProvider[] }>(
      `/api/payments/methods/${context}`
    ),

  createSubscriptionCheckout: (body: {
    planName: string;
    cycle?: 'MONTHLY' | 'YEARLY';
    provider: PaymentProvider;
  }) =>
    http.post<CheckoutSession>('/api/payments/subscription/checkout', body),

  createOrderCheckout: (body: {
    orderId: string;
    provider: PaymentProvider;
  }) =>
    http.post<CheckoutSession>('/api/payments/order/checkout', body),

  confirmCod: (orderId: string) =>
    http.post<{ order: any }>('/api/payments/order/cod/confirm', { orderId }),

  createPortal: () =>
    http.post<{ url: string }>('/api/payments/portal', {}),
};
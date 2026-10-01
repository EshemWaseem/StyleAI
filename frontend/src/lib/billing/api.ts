// lib/billing/api.ts
import { http } from '../api';
import type { BillingMeResponse, Plan, Subscription } from './types';

export const billingApi = {
  getMe: () => http.get<BillingMeResponse>('/api/billing/me'),
  getPlans: () => http.get<{ plans: Plan[] }>('/api/billing/plans'),
  // upgrade REMOVED — use paymentsApi.createSubscriptionCheckout
  cancel: () => http.post<{ subscription: Subscription }>('/api/billing/cancel', {}),
  resume: () => http.post<{ subscription: Subscription }>('/api/billing/resume', {}),
};
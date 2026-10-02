// lib/billing/api.ts
import { http } from '../api';
import type {
  BillingMeResponse,
  Plan,
  PlansResponse,
  Subscription,
  BillingRole,
} from './types';

export const billingApi = {
  getMe: () => http.get<BillingMeResponse>('/api/billing/me'),

  getPlans: (role?: BillingRole) =>
    role
      ? http.get<PlansResponse>(`/api/billing/plans?role=${role}`)
      : http.get<PlansResponse>('/api/billing/plans'),

  cancel: () => http.post<{ subscription: Subscription }>('/api/billing/cancel', {}),
  resume: () => http.post<{ subscription: Subscription }>('/api/billing/resume', {}),

  /** Delete a single FAILED invoice */
  deleteInvoice: (id: string) =>
    http.delete<{ success: true; id: string }>(`/api/billing/invoices/${id}`),

  /** Delete all FAILED invoices in current org */
  deleteAllFailed: () =>
    http.delete<{ success: true; deleted: number }>('/api/billing/invoices'),
};
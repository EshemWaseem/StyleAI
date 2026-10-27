// frontend/src/lib/admin/orders.ts
import { http } from "../api";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export interface AdminOrder {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
  organization?: { id: string; name: string; slug: string } | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    priceAtTime: number;
  }>;
  payments: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
    provider: string;
    paidAt: string | null;
    context: string;
  }>;
}

export const adminOrdersApi = {
  list: (filters: { status?: string; provider?: string; search?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (filters.status) qs.set("status", filters.status);
    if (filters.provider) qs.set("provider", filters.provider);
    if (filters.search) qs.set("search", filters.search);
    if (filters.limit) qs.set("limit", String(filters.limit));
    const q = qs.toString();
    return http.get<{ count: number; orders: AdminOrder[] }>(
      `/api/admin/orders${q ? `?${q}` : ""}`
    );
  },

  get: (id: string) => http.get<{ order: AdminOrder }>(`/api/admin/orders/${id}`),

  confirmDelivery: (id: string) =>
    http.post<{ message: string }>(`/api/admin/orders/${id}/confirm-delivery`, {}),

  cancel: (id: string, reason?: string) =>
    http.post<{ message: string }>(`/api/admin/orders/${id}/cancel`, { reason }),
};
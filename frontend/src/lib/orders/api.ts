// lib/orders/api.ts
import { http } from "../api";

export type OrderStatus =
  | "AWAITING_PAYMENT"
  | "AWAITING_DELIVERY"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export interface OrderItem {
  id: string;
  productId: string | null;
  name: string;
  quantity: number;
  priceAtTime: number;
  product?: {
    primaryImage: string | null;
    slug: string | null;
  } | null;
}

export interface OrderPayment {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  provider: string;
  paidAt: string | null;
}

export interface Order {
  id: string;
  userId: string;
  organizationId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
    notes?: string;
  };
  items: OrderItem[];
  payments?: OrderPayment[];
  createdAt: string;
  updatedAt: string;
}

export const ordersApi = {
  get: (id: string) => http.get<{ order: Order }>(`/api/orders/${id}`),

  list: (filters: { status?: OrderStatus; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (filters.status) qs.set("status", filters.status);
    if (filters.limit) qs.set("limit", String(filters.limit));
    const q = qs.toString();
    return http.get<{ orders: Order[] }>(`/api/orders${q ? `?${q}` : ""}`);
  },
};
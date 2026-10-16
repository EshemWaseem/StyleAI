// frontend/src/lib/payments/api.ts

import { http } from "../api";
import type {
  CheckoutSession,
  PaymentProvider,
  SubscriptionCheckoutInput,
  OrderCheckoutInput,
} from "./types";

export interface VerifySessionResult {
  ok: boolean;
  applied: boolean;
  subscription?: any;
}

export const paymentsApi = {
  getMethods: (context: "SUBSCRIPTION" | "ORDER" | "WALLET_TOPUP") =>
    http.get<{ context: string; providers: PaymentProvider[] }>(
      `/api/payments/methods/${context}`
    ),

  createSubscriptionCheckout: (input: SubscriptionCheckoutInput) =>
    http.post<CheckoutSession>("/api/payments/subscription/checkout", input),

  // ✅ Fallback when webhook doesn't arrive — manually fetch session and apply
  verifySession: (sessionId: string) =>
    http.post<VerifySessionResult>("/api/payments/subscription/verify-session", {
      sessionId,
    }),

  createOrderCheckout: (input: OrderCheckoutInput) =>
    http.post<CheckoutSession>("/api/payments/order/checkout", input),

  confirmCod: (orderId: string) =>
    http.post<{ order: any }>("/api/payments/order/cod/confirm", { orderId }),

  createPortal: () =>
    http.post<{ url: string }>("/api/payments/portal", {}),
};
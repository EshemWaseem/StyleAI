import { http } from "../api";
import type { WalletTransaction } from "./types";

export interface WithdrawalRow extends WalletTransaction {
  owner: { type: string; name: string; email: string };
  method: string;
  destination: string;
}

export const withdrawalsApi = {
  request: (payload: { amount: number; method: "bank" | "paypal" | "stripe"; destination: string; note?: string }) =>
    http.post<{ message: string; transaction: WalletTransaction }>("/api/wallet/me/withdraw", payload),

  list: (filters: { status?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<{ withdrawals: WithdrawalRow[]; total: number; limit: number; offset: number }>(
      `/api/wallet/withdrawals${q ? `?${q}` : ""}`
    );
  },

  review: (txnId: string, payload: { decision: "approve" | "reject"; adminNote?: string }) =>
    http.post<{ message: string; transaction: WalletTransaction }>(
      `/api/wallet/withdrawals/${txnId}/review`, payload
    ),
};
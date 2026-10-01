import { http } from "../api";
import type { Wallet, WalletListResponse } from "./types";

export const walletApi = {
  getMe: () => http.get<{ wallet: Wallet | null }>("/api/wallet/me"),
  listTransactions: (filters: { limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<WalletListResponse>(`/api/wallet/me/transactions${q ? `?${q}` : ""}`);
  },
};
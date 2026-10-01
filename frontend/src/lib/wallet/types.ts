export type WalletTxType =
  | "DEPOSIT" | "WITHDRAWAL"
  | "OFFER_HOLD" | "OFFER_RELEASE" | "OFFER_REFUND"
  | "PLATFORM_FEE" | "ADJUSTMENT";

export interface Wallet {
  id: string;
  currency: string;
  balance: number;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  type: WalletTxType;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  amount: number;
  balanceAfter: number;
  currency: string;
  offerId: string | null;
  note: string | null;
  reference: string | null;
  createdAt: string;
}

export interface WalletListResponse {
  transactions: WalletTransaction[];
  total: number;
  limit: number;
  offset: number;
}
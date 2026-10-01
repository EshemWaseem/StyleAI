export interface Plan {
  name: string;
  label: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  currency: string;
  popular?: boolean;
  features: string[];
  limits: {
    products: number | null;
    aiPerMonth: number | null;
    campaignsPerMonth: number | null;
    teamSeats: number | null;
    storageMb: number | null;
  };
}

export interface Subscription {
  id: string;
  planName: string;
  status: string;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  description: string | null;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}

export interface BillingMeResponse {
  subscription: Subscription;
  plan: Plan;
  invoices: Invoice[];
}
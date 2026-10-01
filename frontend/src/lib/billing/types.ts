// lib/billing/types.ts
// ======================================================
// Billing types — role-aware SaaS
// ======================================================

export type BillingRole = 'BRAND' | 'AGENCY' | 'INFLUENCER';
export type EffectiveState = 'active' | 'trial' | 'trial_expired' | 'past_due' | 'cancelled' | 'expired';

export interface PlanLimits {
  products?: number | null;
  aiTextPerMonth?: number | null;
  aiImagePerMonth?: number | null;
  campaignsPerMonth?: number | null;
  teamSeats?: number | null;
  storageMb?: number | null;
  knowledgeDocs?: number | null;
  assistantMessages?: number | null;
  managedBrands?: number | null;
  campaignApplies?: number | null;
}

export interface Plan {
  name: string;
  role: BillingRole;
  label: string;
  tagline?: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  currency: string;
  popular?: boolean;
  isTrial?: boolean;
  isFree?: boolean;
  trialDays?: number;
  takeRate?: number;
  stripePriceIdMonthly?: string | null;
  stripePriceIdYearly?: string | null;
  features: string[];
  limits: PlanLimits;
}

export interface Subscription {
  id: string;
  role: BillingRole;
  planName: string;
  status: string;
  effectiveState: EffectiveState;
  isTrial: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  createdAt: string;
}

export interface Usage {
  aiTextCalls: number;
  aiImageCalls: number;
  aiAssistMessages: number;
  campaignsCreated: number;
  knowledgeIngests: number;
  storageBytes: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  description: string | null;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}

export interface BillingMeResponse {
  role: BillingRole | null;
  subscription: Subscription | null;
  plan: Plan | null;
  usage: {
    used: Usage;
    limits: PlanLimits;
  } | null;
  invoices: Invoice[];
  isAdmin?: boolean;
}

export interface PlansResponse {
  plans: Plan[] | {
    BRAND: Plan[];
    AGENCY: Plan[];
    INFLUENCER: Plan[];
  };
}
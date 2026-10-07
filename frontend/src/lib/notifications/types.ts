export type NotificationType =
  | "OFFER_SUBMITTED"
  | "OFFER_APPROVED"
  | "OFFER_REJECTED"
  | "OFFER_ACCEPTED"
  | "OFFER_DECLINED"
  | "PAYOUT_RECEIVED"
  | "ESCROW_REFUNDED"
  | "WITHDRAWAL_REQUESTED"
  | "WITHDRAWAL_APPROVED"
  | "WITHDRAWAL_REJECTED"
  | "LISTING_CLAIMED"
  | "LISTING_EXPIRED"
  | "SYSTEM";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  meta: any;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread: number;
  limit: number;
  offset: number;
}

// ======================================================
// Preferences
// ======================================================
export interface NotificationPreference {
  emailTrial: boolean;
  emailOffers: boolean;
  emailCampaigns: boolean;
  emailWallet: boolean;
  emailPayments: boolean;
  emailSystem: boolean;
  unsubscribeToken: string;
  updatedAt: string;
}

export interface UpdatePreferenceInput {
  emailTrial?: boolean;
  emailOffers?: boolean;
  emailCampaigns?: boolean;
  emailWallet?: boolean;
  emailPayments?: boolean;
  emailSystem?: boolean;
}
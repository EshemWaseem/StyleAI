import type { InfluencerPlatform, InfluencerAvailability } from "./types";

export const INFLUENCER_PLATFORMS: InfluencerPlatform[] = [
  "INSTAGRAM", "TIKTOK", "YOUTUBE", "FACEBOOK", "PINTEREST",
  "LINKEDIN", "SNAPCHAT", "TWITTER", "THREADS", "OTHER",
];

export const PLATFORM_LABELS: Record<InfluencerPlatform, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  FACEBOOK: "Facebook",
  PINTEREST: "Pinterest",
  LINKEDIN: "LinkedIn",
  SNAPCHAT: "Snapchat",
  TWITTER: "Twitter / X",
  THREADS: "Threads",
  OTHER: "Other",
};

export const INFLUENCER_CATEGORIES = [
  "fashion", "beauty", "luxury", "lifestyle", "travel",
  "fitness", "food", "tech", "gaming", "parenting", "wedding",
  "footwear", "clothing", "accessories", "bags", "outerwear",
] as const;

export const AVAILABILITY_OPTIONS: InfluencerAvailability[] = [
  "AVAILABLE", "BOOKED", "UNAVAILABLE",
];

export const GENDER_OPTIONS = ["female", "male", "non-binary", "prefer-not-to-say"] as const;

export const CURRENCY_OPTIONS = ["USD", "PKR", "EUR", "GBP", "AED"] as const;



// 12:51 23-09-2026
// import type {
//   InfluencerPlatform,
//   InfluencerAvailability,
// } from "./types";

// export const INFLUENCER_PLATFORMS: InfluencerPlatform[] = [
//   "INSTAGRAM",
//   "TIKTOK",
//   "YOUTUBE",
//   "FACEBOOK",
//   "PINTEREST",
// ];

// export const INFLUENCER_CATEGORIES = [
//   "fashion",
//   "beauty",
//   "luxury",
//   "lifestyle",
//   "travel",
//   "fitness",
//   "food",
//   "tech",
//   "gaming",
//   "parenting",
//   "wedding",
// ] as const;

// export const AVAILABILITY_OPTIONS: InfluencerAvailability[] = [
//   "AVAILABLE",
//   "BOOKED",
//   "UNAVAILABLE",
// ];

// export const GENDER_OPTIONS = [
//   "female",
//   "male",
//   "non-binary",
//   "prefer-not-to-say",
// ] as const;

// export const CURRENCY_OPTIONS = ["USD", "PKR", "EUR", "GBP", "AED"] as const;
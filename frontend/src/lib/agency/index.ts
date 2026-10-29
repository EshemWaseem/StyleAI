// lib/agency/index.ts
export * from "./types";
export {
  agencyApi,
  agencyProfileApi,
  agencyIntegrationsApi,
  agencyCampaignsApi,   
} from "./api";
export type { ExternalCampaign } from "./api";  
export { AgencyProvider, useAgency } from "./context";
   // GENERATED FROM nwp-backend CONTRACT. DO NOT EDIT HERE.
   // CONTRACT SOURCE: nwp-backend (backend/src/types/api-types.ts).
// Copied into nwp-frontend. DO NOT EDIT THE COPY. Mirrors contracts.js.
// Update this file whenever contracts.js changes, and bump CONTRACT_VERSION in both.

export const CONTRACT_VERSION = 3;

export interface LedgerEntry { field: string; valueUsed: unknown; reason: string }
export interface Flag { code: string; message: string }
export interface Unmet { category: string; vendor: string; reason: string }

export type PlanType = 'CE' | 'HP';
export type BomCategory = 'gateway' | 'controller' | 'switch' | 'access_point' | 'enclosure';

export interface BomLine {
  category: BomCategory;
  sku: string;
  name: string;
  vendor: string;
  qty: number;
  unitPrice: number | null;      // null = price on request
  lineTotal: number | null;      // null whenever unitPrice is null
  status: 'ACTIVE' | 'SUNSETTING';
  isGeneric: boolean;
  priceSource?: 'synchronized' | 'manual';
  isStale?: boolean;
  priceUpdatedAt?: string;
}

export interface Bom {
  currency: string;
  lines: BomLine[];
  total: number | null;
  totalIsPartial: boolean;
}

export interface PlanItem { category: string; sku: string; qty: number }

export interface Optics {
  links: number;
  modules: number;
  formFactor: 'SFP' | 'SFP+' | 'SFP28' | 'QSFP+' | 'QSFP28' | null;
}

export interface Plan {
  vendor: string;
  planType: PlanType;
  complete: boolean;
  items: PlanItem[];
  bom: Bom;
  unmet: Unmet[];
  flags: Flag[];
  ledger: LedgerEntry[];
  optics?: Optics | null;                          // null = copper backbone
  powerProtection?: Record<string, unknown>;
  topology?: Record<string, unknown>;              // tighten to nodes/edges once settled
  configurationPlan?: Record<string, unknown>;
  installationMaterials?: Record<string, unknown>;
  limitations?: string[];
}

export interface EngineResult {
  contractVersion: number;
  generatedAt: string;
  requirements: Record<string, unknown>;
  ledger: LedgerEntry[];
  flags: Flag[];
  plans: Plan[];                                   // vendors-list order, CE before HP
  defaultVendor: { CE: string | null; HP: string | null };
}
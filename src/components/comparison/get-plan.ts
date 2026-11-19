import type {
  NetworkPlanData,
  PlanTier,
  VendorName,
  VendorPlansPayload,
} from "./types";

export type PlanLookup =
  | { found: true; plan: NetworkPlanData }
  | { found: false; vendor: VendorName; planType: PlanTier };

export function getPlan(
  plans: VendorPlansPayload,
  vendor: VendorName,
  planType: PlanTier,
): PlanLookup {
  const plan = plans[vendor]?.[planType];

  return plan
    ? { found: true, plan }
    : { found: false, vendor, planType };
}
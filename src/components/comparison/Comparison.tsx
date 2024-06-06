import React, { useMemo } from "react";
import { Button } from "@/components/ui/button"; // NWP-COMPARE-002
import { BackButton } from "@/components/ui/back-button";
import { getPlan } from "./get-plan";
import { VendorSelect } from "./vendorselect";
import { PlanCard } from "./plancard";
import { EmptyState, LoadingState } from "./plan-states";
import {
  PLAN_TIERS,
  VENDOR_NAMES,
  type DefaultVendors,
  type NetworkPlanData, // NWP-COMPARE-002
  type PlanTier,
  type VendorName,
  type VendorPlansPayload,
} from "./types";
import { useSelectedPlan } from "./selected-plan-context";
// NWP-COMPARE-002
export interface PlanChoice {
  tier: PlanTier;
  vendor: VendorName;
}

interface ComparisonProps {
  plansData?: VendorPlansPayload; // undefined = still loading
  defaultVendors?: DefaultVendors;
  /** NWP-COMPARE-002: called with the chosen tier/vendor and that plan's data. */
  onContinue?: (choice: PlanChoice, plan: NetworkPlanData) => void;
  onBackToSummary?: () => void;
}

const generationKeyOf = (plansData?: VendorPlansPayload): string => {
  if (!plansData) return "loading";
  for (const vendor of VENDOR_NAMES) {
    for (const tier of PLAN_TIERS) {
      const plan = plansData[vendor]?.[tier];
      if (plan) return plan.generatedAt;
    }
  }
  return "empty";
};

// The key remounts ComparisonView for every new generation, which also resets
// the selection below.
export const Comparison: React.FC<ComparisonProps> = ({
  plansData,
  defaultVendors,
  onContinue,
  onBackToSummary,
}) => {
  const generationKey = generationKeyOf(plansData);
  return (
    <ComparisonView
      key={generationKey}
      plansData={plansData}
      defaultVendors={defaultVendors}
      onContinue={onContinue}
      onBackToSummary={onBackToSummary}
    />
  );
};

const ComparisonView: React.FC<ComparisonProps> = ({
  plansData,
  defaultVendors,
  onContinue,
  onBackToSummary,
}) => {
  const vendorsByTier = useMemo(() => {
    const result = {} as Record<PlanTier, VendorName[]>;
    for (const tier of PLAN_TIERS) {
      result[tier] = VENDOR_NAMES.filter((v) => plansData?.[v]?.[tier]);
    }
    return result;
  }, [plansData]);

  const { panelChoices, selectedTier, setPanelChoice, setSelectedTier } =
    useSelectedPlan();

  const shownVendor = (tier: PlanTier): VendorName => {
    const list = vendorsByTier[tier];
    const picked = panelChoices[tier];
    if (picked) return picked;
    const preferred = defaultVendors?.[tier];
    if (preferred && list.includes(preferred)) return preferred;
    return list[0] ?? VENDOR_NAMES[0];
  };

  const shown: Record<PlanTier, VendorName> = {
    "Cost-Efficient": shownVendor("Cost-Efficient"),
    "High-Performance": shownVendor("High-Performance"),
  };

  // NWP-COMPARE-002: derived from the selected tier and that card's current vendor.
  const selectedVendor = selectedTier ? shown[selectedTier] : undefined;
  const selectedLookup = selectedTier && selectedVendor && plansData
    ? getPlan(plansData, selectedVendor, selectedTier)
    : undefined;
  const selectedPlan = selectedLookup?.found ? selectedLookup.plan : undefined;
  const canContinue =
    selectedTier !== null && selectedVendor !== undefined && selectedPlan?.complete === true;

  // NWP-COMPARE-002: keep the selection on this card, but clear it when the
  // newly chosen vendor's plan is incomplete.
  const handleVendorChange = (tier: PlanTier, vendor: VendorName) => {
    setPanelChoice(tier, vendor);
    if (selectedTier === tier && plansData?.[vendor]?.[tier]?.complete !== true) {
      setSelectedTier(null);
    }
  };

  const handleContinue = () => {
    if (!canContinue || !selectedTier || !selectedVendor || !selectedPlan) return;
    onContinue?.({ tier: selectedTier, vendor: selectedVendor }, selectedPlan);
  };

  const isLoading = plansData === undefined;
  const hasAnyPlan = PLAN_TIERS.some((t) => vendorsByTier[t].length > 0);

  return (
    <section className="fade-in-content w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
      {onBackToSummary && (
        <BackButton label="Back to summary" onClick={onBackToSummary} />
      )}

      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Vendor Plan Selection & Comparison
        </h1>
        <p className="text-sm text-muted-foreground">
          Compare the Cost-Efficient and High-Performance plans.
          Change the vendor on either card independently to see its hardware and costs.
        </p>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !hasAnyPlan ? (
        <EmptyState />
      ) : (
        <div
          role="radiogroup"
          aria-label="Network plans"
          className="grid grid-cols-1 gap-6"
        >
          {PLAN_TIERS.map((tier) => (
            <PlanPanel
              key={tier}
              tier={tier}
              vendor={shown[tier]}
              defaultVendor={defaultVendors?.[tier]}
              vendorsWithPlans={vendorsByTier[tier]}
              plansData={plansData}
              isSelected={selectedTier === tier}
              onSelect={() => setSelectedTier(tier)}
              onVendorChange={(vendor) => handleVendorChange(tier, vendor)}
            />
          ))}
        </div>
      )}

      {!isLoading && hasAnyPlan && (
        <div className="flex justify-end">
          {/* Solid base: the disabled button is half transparent. */}
          <div className="w-full rounded-md bg-background sm:w-auto">
            <Button
              type="button"
              size="lg"
              className="h-12! w-full px-8! text-base! font-semibold sm:w-auto"
              disabled={!canContinue}
              onClick={handleContinue}
            >
              Continue to final report
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

interface PlanPanelProps {
  tier: PlanTier;
  vendor: VendorName;
  defaultVendor?: VendorName | null;
  vendorsWithPlans: VendorName[];
  plansData: VendorPlansPayload;
  isSelected: boolean;
  onSelect: () => void;
  onVendorChange: (vendor: VendorName) => void;
}

function PlanPanel({
  tier,
  vendor,
  defaultVendor,
  vendorsWithPlans,
  plansData,
  isSelected,
  onSelect,
  onVendorChange,
}: PlanPanelProps) {
  const lookup = getPlan(plansData, vendor, tier);
  const completeVendors = vendorsWithPlans.filter(
    (candidate) => plansData[candidate]?.[tier]?.complete === true,
  );
  const hasDefault = defaultVendor != null && vendorsWithPlans.includes(defaultVendor);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {!hasDefault && vendorsWithPlans.length > 0 && (
        <p role="status" className="rounded-md border border-amber-500/50 bg-[color-mix(in_oklab,var(--color-amber-500)_10%,var(--background))] p-3 text-sm">
          {defaultVendor == null
            ? "No default vendor could be derived."
            : "The default vendor has no plan available."}{" "}
          The first vendor with a plan is shown initially.
        </p>
      )}
      {lookup.found ? (
        <PlanCard
          tier={tier}
          selectedVendor={vendor}
          availableVendors={completeVendors}
          onVendorChange={onVendorChange}
          planData={lookup.plan}
          isSelected={isSelected}
          onSelect={onSelect}
          selectable={lookup.plan.complete}
        />
      ) : (
        <section aria-label={`${tier} plan`} className="rounded-xl border bg-card p-6">
          <h2 className="text-xl font-bold">{tier} Plan</h2>
          <VendorSelect
            tier={tier}
            selectedVendor={vendor}
            availableVendors={completeVendors}
            onVendorChange={onVendorChange}
          />
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            No {tier} plan was returned for {vendor}.
          </p>
        </section>
      )}
    </div>
  );
}

export default Comparison;
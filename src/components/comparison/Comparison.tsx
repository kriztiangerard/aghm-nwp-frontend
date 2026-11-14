import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlanCard } from "./plancard";
import { LoadingState } from "./plan-states";
import { VendorSelect } from "./vendorselect";
import { getPlan } from "./get-plan";
import {
  PLAN_TIERS,
  VENDOR_NAMES,
  type DefaultVendors,
  type NetworkPlanData,
  type PlanTier,
  type VendorName,
  type VendorPlansPayload,
} from "./types";

export interface PlanChoice {
  tier: PlanTier;
  vendor: VendorName;
}

interface ComparisonProps {
  plansData?: VendorPlansPayload;
  defaultVendors?: DefaultVendors;
  onContinue?: (
    choice: PlanChoice,
    plan: NetworkPlanData,
  ) => void;
}

interface PlanPanelProps {
  tier: PlanTier;
  plansData: VendorPlansPayload;
  defaultVendor?: VendorName | null;
  onContinue?: ComparisonProps["onContinue"];
}

const generationKeyOf = (
  plansData: VendorPlansPayload,
): string =>
  JSON.stringify(
    VENDOR_NAMES.map((vendor) =>
      PLAN_TIERS.map(
        (tier) => plansData[vendor]?.[tier]?.generatedAt ?? null,
      ),
    ),
  );

const PlanPanel: React.FC<PlanPanelProps> = ({
  tier,
  plansData,
  defaultVendor,
  onContinue,
}) => {
  const defaultHasPlan =
    defaultVendor != null &&
    getPlan(plansData, defaultVendor, tier).found;

  const [vendor, setVendor] = useState<VendorName>(() => {
    if (defaultHasPlan && defaultVendor) {
      return defaultVendor;
    }

    return (
      VENDOR_NAMES.find(
        (candidate) => getPlan(plansData, candidate, tier).found,
      ) ?? VENDOR_NAMES[0]
    );
  });

  const [confirming, setConfirming] = useState(false);

  const lookup = getPlan(plansData, vendor, tier);
  const plan = lookup.found ? lookup.plan : undefined;

  const completeVendors = VENDOR_NAMES.filter((candidate) => {
    const result = getPlan(plansData, candidate, tier);
    return result.found && result.plan.complete;
  });

  const handleVendorChange = (nextVendor: VendorName) => {
    setVendor(nextVendor);
    setConfirming(false);
  };

  const handleConfirm = () => {
    if (!plan?.complete || !onContinue) return;

    setConfirming(false);
    onContinue({ tier, vendor }, plan);
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {!defaultHasPlan && (
        <p
          role="status"
          className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
        >
          {defaultVendor == null
            ? "No default vendor could be derived."
            : "The default vendor has no plan available."}{" "}
          Initially showing the first vendor in list order
          that has a plan, if available.
        </p>
      )}

      {plan ? (
        <PlanCard
          tier={tier}
          selectedVendor={vendor}
          availableVendors={completeVendors}
          onVendorChange={handleVendorChange}
          planData={plan}
          isSelected={false}
          onSelect={() => {}}
          selectable={plan.complete && Boolean(onContinue)}
          onProceed={() => setConfirming(true)}
        />
      ) : (
        <section
          aria-label={`${tier} plan`}
          className="flex h-full flex-col gap-5 rounded-xl border p-6"
        >
          <h2 className="text-xl font-bold">{tier} Plan</h2>

          <VendorSelect
            tier={tier}
            selectedVendor={vendor}
            availableVendors={completeVendors}
            onVendorChange={handleVendorChange}
          />

          <p role="status" className="text-sm text-muted-foreground">
            No {tier} plan was returned for {vendor}.
            Choose another vendor to view its plan.
          </p>

          <Button type="button" className="mt-auto" disabled>
            Proceed to final report
          </Button>
        </section>
      )}

      {confirming && plan?.complete && (
        <section
          role="region"
          aria-label={`Confirm ${tier} report`}
          className="space-y-3 rounded-lg border bg-muted/30 p-4"
        >
          <p className="text-sm">
            Proceed to the final report with the{" "}
            <strong>{tier}</strong> plan from{" "}
            <strong>{vendor}</strong>?
          </p>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>

            <Button type="button" onClick={handleConfirm}>
              Confirm and proceed
            </Button>
          </div>
        </section>
      )}
    </div>
  );
};

export const Comparison: React.FC<ComparisonProps> = ({
  plansData,
  defaultVendors,
  onContinue,
}) => {
  const generationKey = plansData
    ? generationKeyOf(plansData)
    : "loading";

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Vendor Plan Selection & Comparison
        </h1>

        <p className="text-sm text-muted-foreground">
          Compare Cost-Efficient and High-Performance plans.
          Change the vendor in either panel independently.
        </p>
      </div>

      {plansData === undefined ? (
        <LoadingState />
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
          {PLAN_TIERS.map((tier) => (
            <PlanPanel
              key={JSON.stringify([
                generationKey,
                tier,
                defaultVendors?.[tier],
              ])}
              tier={tier}
              plansData={plansData}
              defaultVendor={defaultVendors?.[tier]}
              onContinue={onContinue}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default Comparison;
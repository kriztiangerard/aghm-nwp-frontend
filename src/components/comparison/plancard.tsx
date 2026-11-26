import React, { useId, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // NWP-COMPARE-002
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils"; // NWP-COMPARE-002
import { formatCurrency, formatDateTime, PRICE_UNAVAILABLE } from "./format";
import type { NetworkPlanData, PlanTier, VendorName } from "./types";
import { VendorSelect } from "./vendorselect";
import { TopologyGraph } from "@/components/topology/topology-graph";
import { ComponentTable } from "./componenttable";

interface PlanCardProps {
  tier: PlanTier;
  selectedVendor: VendorName;
  availableVendors: VendorName[];
  onVendorChange: (vendor: VendorName) => void;
  planData: NetworkPlanData;
  // NWP-COMPARE-002
  isSelected: boolean;
  onSelect: () => void;
  /** The plan's `complete` flag. False disables selection. */
  selectable: boolean;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  tier,
  selectedVendor,
  availableVendors,
  onVendorChange,
  planData,
  isSelected,
  onSelect,
  selectable,
}) => {
  const isCostEfficient = tier === "Cost-Efficient";
  // A partial total with nothing priced would read as 0.00, so say so instead.
  const nothingPriced = planData.totalIsPartial && planData.totalCost === 0;
  // The engine also marks a total partial when the plan is incomplete, so the
  // note must not claim missing prices unless a line really has none.
  const hasUnpriced = planData.bom.some((l) => l.unitPrice === null);
  const unmetRequirements = [...new Set(planData.unmet)];

  // NWP-COMPARE-002
  const titleId = useId();

  // Where the topology puts its legend and floor groups, so the canvas can
  // use the card's full height.
  const [topologyDetails, setTopologyDetails] = useState<HTMLDivElement | null>(
    null,
  );

  const handleCardClick = () => {
    if (selectable) onSelect();
  };

  // Only act when the card itself has focus, so Enter/Space inside the vendor
  // dropdown or the select button keep their own behaviour.
  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (selectable) onSelect();
    }
  };

  // React events bubble through portals, so this also stops clicks inside the
  // dropdown list (rendered outside the card in the DOM) from reaching the card.
  const stopBubbling = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <Card
      role="radio"
      aria-checked={isSelected}
      aria-disabled={!selectable}
      aria-labelledby={titleId}
      tabIndex={selectable ? 0 : -1}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={cn(
        "@container/plan flex flex-col gap-0 py-0 h-full min-w-0 outline-none transition-[box-shadow,border-color]",
        "focus-visible:ring-2 focus-visible:ring-ring",
        selectable && "cursor-pointer",
        isSelected
          ? "border-primary ring-2 ring-primary shadow-xl shadow-primary/40"
          : "border-border/80 shadow-sm",
      )}
    >
      {/* Wide cards: the topology fills the left column from top to bottom;
          the header, hardware and cost sit on the right. Narrow cards, and
          incomplete plans (no topology), use a single column. */}
      <div
        className={cn(
          "grid flex-1 grid-cols-1",
          planData.complete &&
            "@6xl/plan:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @6xl/plan:grid-rows-[auto_auto_1fr]",
        )}
      >
        <CardHeader
          className={cn(
            "flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between",
            planData.complete && "@6xl/plan:col-start-2 @6xl/plan:row-start-1",
          )}
        >
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <CardTitle id={titleId} className="text-xl font-bold">
                {isCostEfficient ? "Cost-Efficient Plan" : "High-Performance Plan"}
              </CardTitle>
              <CardDescription className="text-xs">
                {isCostEfficient
                  ? "Essential qualifying hardware meeting all baseline requirements."
                  : "Next-tier hardware with growth headroom and lower utilization ceiling."}
              </CardDescription>
            </div>

            <div className="w-full sm:w-56" onClick={stopBubbling} onKeyDown={stopBubbling}>
              <VendorSelect
                tier={tier}
                selectedVendor={selectedVendor}
                availableVendors={availableVendors}
                onVendorChange={onVendorChange}
              />
            </div>
          </div>

          {/* NWP-COMPARE-002 */}
          <Button
            type="button"
            size="lg"
            className="w-full shrink-0 sm:w-auto"
            variant={isSelected ? "default" : "outline"}
            disabled={!selectable}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            {isSelected ? "Selected" : "Select this plan"}
          </Button>
        </CardHeader>

        {planData.complete && (
          <>
            <div
              className={cn(
                "relative min-w-0 border-y",
                "@6xl/plan:col-start-1 @6xl/plan:row-start-1 @6xl/plan:row-span-3",
                "@6xl/plan:min-h-[600px] @6xl/plan:border-y-0 @6xl/plan:border-r",
                // The empty and error states fill the column too.
                "@6xl/plan:[&>[data-testid=topology-empty]]:h-full @6xl/plan:[&>[data-testid=topology-error]]:h-full",
              )}
            >
              <TopologyGraph
                planData={planData}
                fill
                detailsContainer={topologyDetails}
              />
            </div>

            <div
              ref={setTopologyDetails}
              className="min-w-0 space-y-3 px-4 pt-4 empty:hidden @6xl/plan:col-start-2 @6xl/plan:row-start-3 @6xl/plan:self-start @6xl/plan:pb-4"
            />
          </>
        )}

        <CardContent
          className={cn(
            "min-w-0 space-y-4 py-4",
            planData.complete
              ? "@6xl/plan:col-start-2 @6xl/plan:row-start-2 @6xl/plan:border-t @6xl/plan:pb-0"
              : "border-t",
          )}
        >
          {!planData.complete && (
            <div
              key={selectedVendor}
              role="alert"
              className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-xs space-y-1.5"
            >
              <p className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                This plan is incomplete. Unmet requirements:
              </p>
              <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                {unmetRequirements.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          )}

          <ComponentTable bom={planData.bom} currency={planData.currency} />

          <div className="text-right space-y-0.5">
            <span className="text-2xl font-extrabold text-primary">
              {nothingPriced
                ? PRICE_UNAVAILABLE
                : formatCurrency(planData.totalCost, planData.currency)}
            </span>
            <span className="text-xs text-muted-foreground block">
              {planData.totalIsPartial ? "Partial total" : "Estimated total"}
            </span>
            {planData.totalIsPartial && (
              <span className="text-[11px] text-amber-700 dark:text-amber-400 block">
                {hasUnpriced
                  ? "Excludes items with unavailable prices"
                  : "Excludes the unmet requirements listed above"}
              </span>
            )}

            <div className="flex flex-col items-end gap-0.5 pt-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Pricing generated {formatDateTime(planData.generatedAt)}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                One-time hardware estimate
              </span>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export default PlanCard;
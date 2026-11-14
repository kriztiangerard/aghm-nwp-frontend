
import React, { useId } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateTime, PRICE_UNAVAILABLE } from "./format";
import type { NetworkPlanData, PlanTier, VendorName } from "./types";
import { VendorSelect } from "./vendorselect";
import { TopologyPlaceholder } from "./topology-placeholder";
import { ComponentTable } from "./componenttable";

interface PlanCardProps {
  tier: PlanTier;
  selectedVendor: VendorName;
  availableVendors: VendorName[];
  onVendorChange: (vendor: VendorName) => void;
  planData: NetworkPlanData;
  isSelected: boolean;
  onSelect: () => void;
  selectable: boolean;
  onProceed?: () => void;
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
  onProceed,
}) => {
  const titleId = useId();
  const isCostEfficient = tier === "Cost-Efficient";
  const canSelect = selectable && planData.complete;
  const isSelectionMode = !onProceed;

  const nothingPriced =
    planData.totalIsPartial && planData.totalCost === 0;
  const hasUnpriced = planData.bom.some(
    (line) => line.unitPrice === null,
  );

  const handleCardClick = () => {
    if (isSelectionMode && canSelect) {
      onSelect();
    }
  };

  const handleCardKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (
      event.target !== event.currentTarget ||
      !isSelectionMode ||
      !canSelect
    ) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  const stopBubbling = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <Card
      role={isSelectionMode ? "radio" : "region"}
      aria-checked={isSelectionMode ? isSelected : undefined}
      aria-disabled={isSelectionMode ? !canSelect : undefined}
      aria-labelledby={titleId}
      tabIndex={isSelectionMode && canSelect ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={cn(
        "flex h-full min-w-0 flex-col outline-none",
        "transition-[box-shadow,border-color]",
        "focus-visible:ring-2 focus-visible:ring-ring",
        isSelectionMode && canSelect && "cursor-pointer",
        isSelectionMode && isSelected
          ? "border-primary ring-2 ring-primary shadow-xl shadow-primary/40"
          : "border-border/80 shadow-sm",
      )}
    >
      <CardHeader className="flex flex-col gap-4 space-y-0 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <CardTitle id={titleId} className="text-xl font-bold">
            {isCostEfficient
              ? "Cost-Efficient Plan"
              : "High-Performance Plan"}
          </CardTitle>

          <CardDescription className="text-xs">
            {isCostEfficient
              ? "Hardware selected to meet baseline requirements at a lower cost."
              : "Next-tier hardware with growth headroom and a lower utilization ceiling."}
          </CardDescription>
        </div>

        <div
          className="shrink-0 sm:w-52"
          onClick={stopBubbling}
          onKeyDown={stopBubbling}
        >
          <VendorSelect
            tier={tier}
            selectedVendor={selectedVendor}
            availableVendors={availableVendors}
            onVendorChange={onVendorChange}
          />
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 space-y-6 pt-5">
        {planData.complete ? (
          <TopologyPlaceholder
            tier={tier}
            selectedVendor={selectedVendor}
            topology={planData.topology}
          />
        ) : (
          <div
            role="alert"
            className="space-y-1.5 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-xs"
          >
            <p className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
              <AlertTriangle
                className="h-4 w-4"
                aria-hidden="true"
              />
              This plan is incomplete. Unmet requirements:
            </p>

            {planData.unmet.length > 0 ? (
              <ul className="list-disc space-y-0.5 pl-5 text-foreground">
                {planData.unmet.map((requirement, index) => (
                  <li key={`${index}-${requirement}`}>
                    {requirement}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-foreground">
                No requirement details were provided for this plan.
              </p>
            )}
          </div>
        )}

        <ComponentTable
          bom={planData.bom}
          currency={planData.currency}
        />

        <div className="space-y-0.5 text-right">
          <span className="text-2xl font-extrabold text-primary">
            {nothingPriced
              ? PRICE_UNAVAILABLE
              : formatCurrency(
                  planData.totalCost,
                  planData.currency,
                )}
          </span>

          <span className="block text-xs text-muted-foreground">
            {planData.totalIsPartial
              ? "Partial total"
              : "Estimated total"}
          </span>

          {planData.totalIsPartial && (
            <span className="block text-[11px] text-amber-700 dark:text-amber-400">
              {hasUnpriced
                ? "Excludes items with unavailable prices"
                : "Excludes the unmet requirements listed above"}
            </span>
          )}
        </div>

        <Button
          type="button"
          className="w-full"
          variant={onProceed || isSelected ? "default" : "outline"}
          disabled={!canSelect}
          onClick={(event) => {
            event.stopPropagation();

            if (!canSelect) return;

            if (onProceed) {
              onProceed();
            } else {
              onSelect();
            }
          }}
        >
          {onProceed
            ? "Proceed to final report"
            : isSelected
              ? "Selected"
              : "Select this plan"}
        </Button>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 pb-4 pt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Pricing generated {formatDateTime(planData.generatedAt)}
        </span>

        <span className="flex items-center gap-1">
          <CheckCircle2
            className="h-3.5 w-3.5 text-emerald-600"
            aria-hidden="true"
          />
          One-time hardware estimate
        </span>
      </CardFooter>
    </Card>
  );
};

export default PlanCard;

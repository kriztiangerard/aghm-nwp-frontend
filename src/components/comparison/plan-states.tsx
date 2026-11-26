import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Inbox } from "lucide-react";
import type { PlanTier } from "./types";

const Bar: React.FC<{ className: string }> = ({ className }) => (
  <div className={`animate-pulse rounded-md bg-muted ${className}`} />
);

export const PlanCardSkeleton: React.FC = () => (
  <Card
    className="@container/plan h-full min-w-0 py-0 border-border/80 shadow-sm"
    aria-hidden="true"
  >
    <div className="grid grid-cols-1 @6xl/plan:grid-cols-2">
      <Bar className="order-2 h-56 w-full @6xl/plan:order-1 @6xl/plan:h-[600px] @6xl/plan:rounded-none" />
      <div className="order-1 space-y-4 p-4 @6xl/plan:order-2">
        <Bar className="h-6 w-1/2" />
        <Bar className="h-9 w-56 max-w-full" />
        <Bar className="h-32 w-full" />
      </div>
    </div>
  </Card>
);

export const LoadingState: React.FC = () => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading plans"
    className="grid grid-cols-1 gap-6"
  >
    <PlanCardSkeleton />
    <PlanCardSkeleton />
  </div>
);

// One tier has no plan: keeps its place so the other card stays put.
export const EmptyPlanCard: React.FC<{ tier: PlanTier }> = ({ tier }) => (
  <Card className="h-full min-w-0 border-dashed">
    <CardContent className="flex h-full min-h-56 flex-col items-center justify-center gap-2 p-6 text-center">
      <Inbox className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">No {tier} plan available</p>
      <p className="text-xs text-muted-foreground max-w-xs">
        None of the vendors produced a {tier} plan for these requirements.
      </p>
    </CardContent>
  </Card>
);

// Neither tier has any plan.
export const EmptyState: React.FC = () => (
  <div
    role="status"
    className="rounded-lg border-2 border-dashed bg-card p-10 text-center space-y-2"
  >
    <Inbox className="w-8 h-8 mx-auto text-muted-foreground" aria-hidden="true" />
    <p className="text-sm font-medium">No plans available</p>
    <p className="text-xs text-muted-foreground">
      No vendor returned a plan for the submitted requirements.
    </p>
  </div>
);
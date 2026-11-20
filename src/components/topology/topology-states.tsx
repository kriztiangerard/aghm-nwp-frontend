import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Network } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * NWP-TOPO-006: loading, empty and error states for the topology panel.
 * Each one keeps roughly the canvas's footprint, so the BOM and the controls
 * below it don't jump when the diagram arrives or fails.
 */

/** AC2: shown while the layout worker runs. */
export function TopologySkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading topology diagram"
      className="space-y-4"
      data-testid="topology-skeleton"
    >
      <div className="relative h-[640px] w-full overflow-hidden rounded-lg border bg-background p-6">
        {/* A rough tree: one row for the gateway, then switches, then APs and clients. */}
        <div className="flex h-full flex-col items-center justify-around">
          <Skeleton className="h-20 w-40 rounded-xl" />
          <div className="flex gap-8">
            <Skeleton className="h-20 w-36 rounded-xl" />
            <Skeleton className="h-20 w-36 rounded-xl" />
          </div>
          <div className="flex gap-6">
            <Skeleton className="h-20 w-32 rounded-xl" />
            <Skeleton className="h-20 w-32 rounded-xl" />
            <Skeleton className="h-20 w-32 rounded-xl" />
          </div>
        </div>
      </div>
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

/** AC4: the adapter returned `unavailable`, so there is nothing to draw. */
export function TopologyEmptyState({ reason }: { reason: string }) {
  return (
    <div
      className="flex h-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-6 text-center"
      data-testid="topology-empty"
    >
      <Network className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">No topology diagram for this plan</p>
      <p className="max-w-md text-xs text-muted-foreground">{reason}</p>
    </div>
  );
}

/** AC3: shown for adapter, layout and render errors. */
export function TopologyErrorState({
  detail,
  onRetry,
}: {
  /** Developer detail, shown only in dev builds. */
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex h-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-6 text-center"
      data-testid="topology-error"
    >
      <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
      <p className="text-sm font-medium">Topology could not be displayed</p>
      <p className="max-w-md text-xs text-muted-foreground">
        The hardware list and the rest of this page are not affected.
      </p>
      {import.meta.env.DEV && detail && (
        <p className="max-w-md break-words font-mono text-[11px] text-muted-foreground">
          {detail}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
}

interface BoundaryState {
  error: Error | null;
}

/**
 * AC3: catches errors thrown while rendering the topology (the adapter runs
 * during render, plus React Flow and the custom nodes and edges), so they
 * stay inside the panel. TopologyGraph keys this boundary by plan, so a
 * vendor change starts with a clean boundary.
 */
export class TopologyErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[topology] render failed", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <TopologyErrorState
          detail={this.state.error.message}
          onRetry={this.reset}
        />
      );
    }
    return this.props.children;
  }
}

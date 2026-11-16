import { useMemo } from "react";
import type { Node } from "@xyflow/react";

import {
  EDGE_VARIANTS,
  EDGE_VARIANT_STYLES,
  resolveEdgeVariant,
  type EdgeVariant,
} from "./edge-style";
import {
  IntegratedFunctionBadge,
  SunsettingBadge,
} from "./topology-badges";
import type { FlowNodeData, TopologyFlowEdge } from "./types";

/**
 * NWP-TOPO-003: legend for the topology canvas.
 *
 * Lists only the line styles and badges that appear in this plan's graph.
 * When a fiber backbone is present, copper is always listed too, so the user
 * can compare the two (AC7).
 */

interface TopologyLegendProps {
  nodes: Node<FlowNodeData>[];
  edges: TopologyFlowEdge[];
  className?: string;
}

function EdgeSwatch({ variant }: { variant: EdgeVariant }) {
  const style = EDGE_VARIANT_STYLES[variant];

  return (
    <svg
      width="44"
      height="12"
      viewBox="0 0 44 12"
      aria-hidden="true"
      className="shrink-0"
    >
      <line
        x1="2"
        y1="6"
        x2="42"
        y2="6"
        style={{
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          strokeDasharray: style.dasharray,
          strokeLinecap: style.linecap,
        }}
      />
      {style.cased && (
        <line
          x1="2"
          y1="6"
          x2="42"
          y2="6"
          style={{
            stroke: "var(--topo-edge-fiber-core)",
            strokeWidth: style.strokeWidth / 3,
          }}
        />
      )}
    </svg>
  );
}

export function TopologyLegend({
  nodes,
  edges,
  className,
}: TopologyLegendProps) {
  const { variants, hasIntegrated, hasSunsetting, hasManagement } =
    useMemo(() => {
      const present = new Set(
        edges.map((edge) => resolveEdgeVariant(edge.data)),
      );
      if (present.has("fiber")) present.add("copper");

      return {
        variants: EDGE_VARIANTS.filter((variant) => present.has(variant)),
        hasIntegrated: nodes.some(
          (node) =>
            (node.data.integrates?.length ?? 0) > 0 ||
            Boolean(node.data.integratedWith),
        ),
        hasSunsetting: nodes.some(
          (node) => node.data.status === "SUNSETTING",
        ),
        hasManagement: edges.some(
          (edge) => edge.data?.linkType === "management",
        ),
      };
    }, [nodes, edges]);

  if (variants.length === 0 && !hasIntegrated && !hasSunsetting) {
    return null;
  }

  return (
    <section
      aria-label="Topology legend"
      className={className ?? "rounded-lg border bg-card p-3"}
      data-testid="topology-legend"
    >
      <h4 className="text-sm font-semibold">Legend</h4>

      {variants.length > 0 && (
        <ul className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {variants.map((variant) => (
            <li
              key={variant}
              className="flex items-start gap-2 text-xs"
              data-testid={`topology-legend-${variant}`}
            >
              <span className="mt-0.5">
                <EdgeSwatch variant={variant} />
              </span>
              <span>
                <span className="font-medium">
                  {EDGE_VARIANT_STYLES[variant].legendLabel}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  — {EDGE_VARIANT_STYLES[variant].legendDescription}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        Arrows follow the data path from the internet inward.
        {hasManagement &&
          " The management link has no arrow because it carries control traffic, not user data."}{" "}
        Numbers on links (for example “PoE ×6”) count the device connections
        on that link.
      </p>

      {(hasIntegrated || hasSunsetting) && (
        <ul className="mt-2 space-y-1.5">
          {hasIntegrated && (
            <li className="flex flex-wrap items-center gap-2 text-xs">
              <IntegratedFunctionBadge fn="firewall" />
              <span className="text-muted-foreground">
                One device performs this function too; it is drawn as its own
                node only to show the layer.
              </span>
            </li>
          )}
          {hasSunsetting && (
            <li className="flex flex-wrap items-center gap-2 text-xs">
              <SunsettingBadge />
              <span className="text-muted-foreground">
                Being phased out by the vendor; confirm availability with a
                distributor.
              </span>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

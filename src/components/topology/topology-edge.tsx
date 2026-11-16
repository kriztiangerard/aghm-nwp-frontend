import { createContext, useContext } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
} from "@xyflow/react";

import {
  EDGE_VARIANTS,
  EDGE_VARIANT_STYLES,
  describeEdge,
  resolveEdgeVariant,
  showsDirection,
  type EdgeVariant,
} from "./edge-style";
import { TOPOLOGY_EDGE_TYPE, type FlowEdgeData } from "./types";

/**
 * NWP-TOPO-003: one custom edge with label and style variants
 * (copper, fiber, PoE, wireless, logical).
 *
 * Arrowheads come from our own SVG markers and not React Flow's built-in
 * MarkerType, because built-in markers need a literal colour, and our
 * colours are CSS variables that change with the theme. Each canvas gets its
 * own id prefix, so the side-by-side plan panels and the expanded dialog
 * never share marker ids.
 */
export const TopologyMarkerContext = createContext("topology");

export const markerId = (prefix: string, variant: EdgeVariant) =>
  `${prefix}-arrow-${variant}`;

export function TopologyEdgeMarkers({ prefix }: { prefix: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute size-0 overflow-hidden"
    >
      <defs>
        {EDGE_VARIANTS.map((variant) => (
          <marker
            key={variant}
            id={markerId(prefix, variant)}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="10"
            markerHeight="10"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path
              d="M0,0 L10,5 L0,10 z"
              style={{ fill: EDGE_VARIANT_STYLES[variant].stroke }}
            />
          </marker>
        ))}
      </defs>
    </svg>
  );
}

export function TopologyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<Edge<FlowEdgeData>>) {
  const prefix = useContext(TopologyMarkerContext);
  const variant = resolveEdgeVariant(data);
  const style = EDGE_VARIANT_STYLES[variant];
  const label = describeEdge(data);

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  const marker = showsDirection(data)
    ? `url(#${markerId(prefix, variant)})`
    : undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          strokeDasharray: style.dasharray,
          strokeLinecap: style.linecap,
        }}
      />

      {style.cased && (
        <path
          d={path}
          fill="none"
          className="pointer-events-none"
          style={{
            stroke: "var(--topo-edge-fiber-core)",
            strokeWidth: style.strokeWidth / 3,
          }}
        />
      )}

      {/* Separate transparent path, so the fiber core never draws over the arrowhead. */}
      {marker && (
        <path
          d={path}
          fill="none"
          stroke="transparent"
          className="pointer-events-none"
          markerEnd={marker}
        />
      )}

      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute whitespace-nowrap rounded-sm border px-1 text-[9px] font-medium leading-4"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              borderColor: style.stroke,
              backgroundColor: "var(--topo-edge-label-bg)",
              color: "var(--topo-edge-label-fg)",
            }}
            data-testid={`topology-edge-label-${id}`}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const topologyEdgeTypes: EdgeTypes = {
  [TOPOLOGY_EDGE_TYPE]: TopologyEdge,
  default: TopologyEdge,
};

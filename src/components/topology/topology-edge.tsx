import { useContext } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

import {
  EDGE_VARIANTS,
  EDGE_VARIANT_STYLES,
  describeEdge,
  resolveEdgeVariant,
  showsDirection,
} from "./edge-style";
import { TopologyMarkerContext, markerId } from "./edge-markers";
import type { FlowEdgeData } from "./types";

/**
 * NWP-TOPO-003: one custom edge with label and style variants
 * (copper, fiber, PoE, wireless, logical).
 *
 * Arrowheads come from our own SVG markers and not React Flow's built-in
 * MarkerType, because built-in markers need a literal colour, and our
 * colours are CSS variables that change with the theme. Each canvas gets its
 * own id prefix, so the side-by-side plan panels and the expanded dialog
 * never share marker ids (see edge-markers.ts).
 *
 * The edge registry lives in flow-types.ts, so this file exports only
 * components (react-refresh/only-export-components).
 */

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

  const [path, centerX, centerY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  // An edge from a right-side handle down into a card's top is L-shaped, and
  // the default label point (midway between the ends) floats off the line.
  // Pin it to the middle of the vertical run instead (QA round 2: stacked core
  // switches route their device links this way).
  const lShaped =
    sourcePosition === Position.Right && targetPosition === Position.Top;
  const labelX = lShaped ? targetX : centerX;
  const labelY = lShaped ? (sourceY + targetY) / 2 : centerY;

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
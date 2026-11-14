
import React, { useMemo } from "react";
import dagre from "@dagrejs/dagre";
import { Network } from "lucide-react";
import type {
  NetworkPlanData,
  PlanTier,
  VendorName,
} from "./types";

interface TopologyPlaceholderProps {
  tier: PlanTier;
  selectedVendor: VendorName;
  topology: NetworkPlanData["topology"];
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 72;

const formatValue = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

export const TopologyPlaceholder: React.FC<TopologyPlaceholderProps> = ({
  tier,
  selectedVendor,
  topology,
}) => {
  const layout = useMemo(() => {
    if (!topology || topology.nodes.length === 0) {
      return null;
    }

    const graph = new dagre.graphlib.Graph()
      .setDefaultEdgeLabel(() => ({}));

    graph.setGraph({
      rankdir: "LR",
      nodesep: 28,
      ranksep: 48,
      marginx: 24,
      marginy: 24,
    });

    topology.nodes.forEach((node) => {
      graph.setNode(node.id, {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    });

    const validEdges = topology.edges.filter(
      (edge) =>
        topology.nodes.some((node) => node.id === edge.source) &&
        topology.nodes.some((node) => node.id === edge.target),
    );

    validEdges.forEach((edge) => {
      graph.setEdge(edge.source, edge.target, {
        label: `${formatValue(edge.type)} · ${formatValue(edge.medium)}`,
      });
    });

    dagre.layout(graph);

    return {
      graph,
      nodes: topology.nodes,
      edges: validEdges,
      width: graph.graph().width ?? 0,
      height: graph.graph().height ?? 0,
    };
  }, [topology]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold">
          <Network className="h-4 w-4 text-muted-foreground" />
          Network Topology
        </h4>
      </div>

      <div className="w-full overflow-x-auto rounded-lg border bg-muted/20">
        {!layout ? (
          <div
            data-testid={`topology-unavailable-${tier}`}
            className="flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center"
          >
            <Network className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-medium">
              Topology unavailable
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              No logical topology data was provided for this plan.
            </p>
          </div>
        ) : (
          <svg
            data-testid={`topology-diagram-${tier}`}
            role="img"
            aria-label={`${selectedVendor} ${tier} network topology`}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            width={layout.width}
            height={layout.height}
            className="mx-auto max-w-none"
          >
            <defs>
              <marker
                id={`topology-arrow-${tier}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>

            {layout.edges.map((edge) => {
              const positionedEdge = layout.graph.edge(
                edge.source,
                edge.target,
              );

              const points: Array<{ x: number; y: number }> =
                positionedEdge?.points ?? [];

              if (points.length === 0) return null;

              const path = points
                .map(
                  (point: { x: number; y: number }, index: number) =>
                    `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
                )
                .join(" ");

              return (
                <g key={edge.id}>
                  <path
                    d={path}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.55"
                    strokeWidth="1.5"
                    markerEnd={`url(#topology-arrow-${tier})`}
                  />

                  <text
                    x={positionedEdge?.x}
                    y={positionedEdge?.y}
                    textAnchor="middle"
                    className="fill-muted-foreground"
                    fontSize="9"
                  >
                    {formatValue(edge.type)}
                  </text>
                </g>
              );
            })}

            {layout.nodes.map((node) => {
              const position = layout.graph.node(node.id);

              if (!position) return null;

              const x = position.x - NODE_WIDTH / 2;
              const y = position.y - NODE_HEIGHT / 2;
              const quantity = node.qty ?? node.count;

              return (
                <g key={node.id}>
                  <title>
                    {`${node.label} (${formatValue(node.role)})`}
                    {node.sku ? ` — ${node.sku}` : ""}
                  </title>

                  <rect
                    x={x}
                    y={y}
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx="8"
                    className="fill-background stroke-border"
                    strokeWidth="1.5"
                  />

                  <text
                    x={position.x}
                    y={y + 22}
                    textAnchor="middle"
                    className="fill-foreground"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {node.label.length > 25
                      ? `${node.label.slice(0, 22)}...`
                      : node.label}
                  </text>

                  <text
                    x={position.x}
                    y={y + 40}
                    textAnchor="middle"
                    className="fill-muted-foreground"
                    fontSize="9"
                  >
                    {formatValue(node.role)}
                    {quantity != null ? ` · Qty: ${quantity}` : ""}
                  </text>

                  <text
                    x={position.x}
                    y={y + 55}
                    textAnchor="middle"
                    className="fill-muted-foreground"
                    fontSize="8"
                  >
                    {node.sku ?? node.layer}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Logical network layout. Actual cabling and physical placement may differ.
      </p>
    </section>
  );
};

export default TopologyPlaceholder;

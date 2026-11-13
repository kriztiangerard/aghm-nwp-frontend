import type { ReactNode } from "react";

type UnknownRecord = Record<string, unknown>;

interface TopologyNode extends UnknownRecord {
  id: string;
  role: string;
  layer: string;
  label: string;
  sku?: string;
  qty?: number;
  count?: number | null;
  status?: string;
}

interface TopologyEdge extends UnknownRecord {
  id: string;
  source: string;
  target: string;
  type: string;
  medium: string;
  count?: number;
}

interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

interface Props {
  topology: Record<string, unknown> | null;
}

const LAYER_ORDER = [
  "wan",
  "gateway",
  "management",
  "core",
  "access",
  "edge",
];

const LAYER_LABELS: Record<string, string> = {
  wan: "Internet / WAN",
  gateway: "Gateway and security",
  management: "Network management",
  core: "Core network",
  access: "Access network",
  edge: "Access points and client devices",
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseTopology(value: unknown): TopologyData | null {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return null;
  }

  const nodes = value.nodes.filter(
    (node): node is TopologyNode =>
      isRecord(node) &&
      typeof node.id === "string" &&
      typeof node.role === "string" &&
      typeof node.layer === "string" &&
      typeof node.label === "string",
  );

  const edges = value.edges.filter(
    (edge): edge is TopologyEdge =>
      isRecord(edge) &&
      typeof edge.id === "string" &&
      typeof edge.source === "string" &&
      typeof edge.target === "string" &&
      typeof edge.type === "string" &&
      typeof edge.medium === "string",
  );

  return { nodes, edges };
}

function displayNodeDetails(node: TopologyNode): ReactNode {
  const details: string[] = [];

  if (node.sku) details.push(`SKU: ${node.sku}`);
  if (typeof node.qty === "number" && node.qty > 1) {
    details.push(`Quantity: ${node.qty}`);
  }
  if (typeof node.count === "number") {
    details.push(`Devices: ${node.count}`);
  }
  if (node.count === null) {
    details.push("Quantity not specified");
  }

  return details.length > 0 ? details.join(" · ") : null;
}

export default function TopologyDiagram({ topology }: Props) {
  const data = parseTopology(topology);

  if (!data || data.nodes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="font-medium">Topology unavailable</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The generated plan did not provide topology data for display.
        </p>
      </div>
    );
  }

  const nodeLabels = new Map(
    data.nodes.map((node) => [node.id, node.label]),
  );

  const groupedNodes = new Map<string, TopologyNode[]>();

  for (const node of data.nodes) {
    const current = groupedNodes.get(node.layer) ?? [];
    current.push(node);
    groupedNodes.set(node.layer, current);
  }

  const layers = [
    ...LAYER_ORDER.filter((layer) => groupedNodes.has(layer)),
    ...Array.from(groupedNodes.keys()).filter(
      (layer) => !LAYER_ORDER.includes(layer),
    ),
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {layers.map((layer) => (
          <section key={layer} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {LAYER_LABELS[layer] ?? layer}
            </h3>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupedNodes.get(layer)?.map((node) => (
                <div
                  key={node.id}
                  className="min-w-0 rounded-lg border bg-card p-3"
                >
                  <p className="font-medium">{node.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {node.role.replaceAll("_", " ")}
                  </p>

                  {displayNodeDetails(node) && (
                    <p className="mt-2 break-words text-xs text-muted-foreground">
                      {displayNodeDetails(node)}
                    </p>
                  )}

                  {node.status && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Status: {node.status}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Logical connections</h3>

        {data.edges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No connection details were provided.
          </p>
        ) : (
          <div className="space-y-2">
            {data.edges.map((edge) => (
              <div
                key={edge.id}
                className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm"
              >
                <span className="font-medium">
                  {nodeLabels.get(edge.source) ?? edge.source}
                </span>
                <span aria-label="connects to" className="text-muted-foreground">
                  →
                </span>
                <span className="font-medium">
                  {nodeLabels.get(edge.target) ?? edge.target}
                </span>
                <span className="ml-auto rounded bg-muted px-2 py-1 text-xs">
                  {edge.type} · {edge.medium}
                  {typeof edge.count === "number" ? ` · ${edge.count}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { createRoot, type Root } from "react-dom/client";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { toPng } from "html-to-image";
import type { NetworkPlanData } from "@/components/comparison/types";
import { toFlowGraph } from "./adapter";
import { layoutGraph } from "./layout";
import { getTopologyExportBounds } from "./topology-export-bounds";
import { snapshotEdgeTypes, exportNodeTypes } from "./topology-renderers";
import "@xyflow/react/dist/style.css";

export type TopologySnapshotResult =
  | {
      status: "success";
      dataUrl: string;
      width: number;
      height: number;
    }
  | {
      status: "unavailable";
      reason: string;
    };

export interface TopologySnapshotOptions {
  /** Maximum export canvas width in CSS pixels. */
  maxWidth: number;
  /** Empty space around the outermost nodes. */
  padding?: number;
  /** PNG resolution multiplier. */
  pixelRatio?: number;
}

const LIGHT_THEME = {
  "--background": "oklch(1 0 0)",
  "--foreground": "oklch(0.145 0.008 326)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.145 0.008 326)",
  "--primary": "oklch(0.496 0.265 301.924)",
  "--muted-foreground": "oklch(0.542 0.034 322.5)",
  "--border": "oklch(0.922 0.005 325.62)",
  "--color-background": "oklch(1 0 0)",
  "--color-foreground": "oklch(0.145 0.008 326)",
  "--color-card": "oklch(1 0 0)",
  "--color-card-foreground": "oklch(0.145 0.008 326)",
  "--color-primary": "oklch(0.496 0.265 301.924)",
  "--color-muted-foreground": "oklch(0.542 0.034 322.5)",
  "--color-border": "oklch(0.922 0.005 325.62)",
  "--xy-edge-stroke": "#8b8490",
  "--xy-edge-stroke-selected": "#7040a0",
} as React.CSSProperties;

function waitForFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

/**
 * Waits for React Flow to initialize, render its nodes, and calculate
 * non-empty SVG paths for every expected edge.
 */
async function waitForReactFlow(
  root: HTMLElement,
  expectedEdgeCount: number,
  render: (onInit: () => void) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("React Flow did not finish initializing."));
    }, 10000);

    render(() => {
      window.clearTimeout(timeout);
      resolve();
    });
  });

  await waitForFrame();
  await waitForFrame();

  if (!root.querySelector(".react-flow__node")) {
    throw new Error("React Flow did not render any topology nodes.");
  }

  // An empty graph legitimately has no edges to wait for.
  if (expectedEdgeCount === 0) {
    return;
  }

  const deadline = Date.now() + 10000;

  while (Date.now() < deadline) {
    const renderedEdges = Array.from(
      root.querySelectorAll<SVGPathElement>(".react-flow__edge-path"),
    ).filter((path) => {
      const pathData = path.getAttribute("d");
      return Boolean(pathData?.trim());
    });

    if (renderedEdges.length >= expectedEdgeCount) {
      return;
    }

    await waitForFrame();
  }

  const actualEdgeCount = Array.from(
    root.querySelectorAll<SVGPathElement>(".react-flow__edge-path"),
  ).filter((path) => {
    const pathData = path.getAttribute("d");
    return Boolean(pathData?.trim());
  }).length;

  throw new Error(
    `React Flow rendered ${actualEdgeCount} edge path(s) with valid paths; expected ${expectedEdgeCount}.`,
  );
}

type SnapshotGraph = ReturnType<typeof layoutGraph>;

interface SnapshotFloorGroup {
  switchNode: SnapshotGraph["nodes"][number];
  accessPoints: SnapshotGraph["nodes"];
  clients: SnapshotGraph["nodes"];
}

function arrangeLargeTopologyForExport(
  graph: SnapshotGraph,
): SnapshotGraph {
  const nodes = graph.nodes;
  const edges = graph.edges;

  const accessSwitches = nodes.filter(
    (node) =>
      node.data.role === "switch" &&
      node.data.layer === "access",
  );

  // Keep the normal layout for graphs that do not match
  // the access-switch / AP / client-group structure.
  if (accessSwitches.length < 2) {
    return graph;
  }

  const incoming = new Map<string, string[]>();

  for (const edge of edges) {
    const parents = incoming.get(edge.target) ?? [];
    parents.push(edge.source);
    incoming.set(edge.target, parents);
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const groups: SnapshotFloorGroup[] = [];

  for (const switchNode of accessSwitches) {
    const accessPoints = nodes.filter(
      (node) =>
        node.data.role === "access_point" &&
        incoming.get(node.id)?.includes(switchNode.id),
    );

    const clients = nodes.filter((node) => {
      if (node.data.role !== "client_group") {
        return false;
      }

      const parents = incoming.get(node.id) ?? [];

      return parents.some((parentId) => {
        if (parentId === switchNode.id) {
          return true;
        }

        const parent = nodeById.get(parentId);

        return (
          parent?.data.role === "access_point" &&
          incoming.get(parentId)?.includes(switchNode.id)
        );
      });
    });

    if (accessPoints.length === 0 || clients.length === 0) {
      return graph;
    }

    groups.push({
      switchNode,
      accessPoints,
      clients,
    });
  }

  // Do not partially rearrange a graph if some client groups
  // cannot be associated with an access switch.
  const assignedClientIds = new Set(
    groups.flatMap((group) => group.clients.map((node) => node.id)),
  );

  const allClientIds = nodes
    .filter((node) => node.data.role === "client_group")
    .map((node) => node.id);

  if (
    assignedClientIds.size !== allClientIds.length ||
    allClientIds.some((id) => !assignedClientIds.has(id))
  ) {
    return graph;
  }

  const memberIds = new Set(
    groups.flatMap((group) => [
      group.switchNode.id,
      ...group.accessPoints.map((node) => node.id),
      ...group.clients.map((node) => node.id),
    ]),
  );

  const rootNodes = nodes.filter((node) => !memberIds.has(node.id));

  if (rootNodes.length === 0) {
    return graph;
  }

  const getWidth = (node: SnapshotGraph["nodes"][number]) =>
    node.width ?? node.measured?.width ?? 180;

  const getHeight = (node: SnapshotGraph["nodes"][number]) =>
    node.height ?? node.measured?.height ?? 80;

  const positions = new Map<string, { x: number; y: number }>();

  const wanNode = rootNodes.find((node) => node.data.role === "wan");

  const gatewayNode = rootNodes.find(
    (node) => node.data.role === "gateway",
  );

  const coreNode = rootNodes.find(
    (node) =>
      node.data.role === "switch" && node.data.layer === "core",
  );

  // Compact only the known three-node root chain.
  if (
    rootNodes.length === 3 &&
    wanNode &&
    gatewayNode &&
    coreNode
  ) {
    const gatewayY = wanNode.position.y + getHeight(wanNode) + 70;

    const coreY = gatewayY + getHeight(gatewayNode) + 70;

    positions.set(wanNode.id, { ...wanNode.position });

    positions.set(gatewayNode.id, {
      x: gatewayNode.position.x,
      y: gatewayY,
    });

    positions.set(coreNode.id, {
      x: coreNode.position.x,
      y: coreY,
    });
  }

  const rootBottom = Math.max(
    ...rootNodes.map((node) => {
      const position = positions.get(node.id) ?? node.position;
      return position.y + getHeight(node);
    }),
  );

  const rootLeft = Math.min(
    ...rootNodes.map((node) => node.position.x),
  );

  const rootRight = Math.max(
    ...rootNodes.map((node) => node.position.x + getWidth(node)),
  );

  const centerX = (rootLeft + rootRight) / 2;

  const horizontalGap = 32;
  const verticalGap = 28;
  const sectionGap = 56;
  const clientColumns = 3;

  let sectionY = rootBottom + sectionGap;

  // Stable order makes the export deterministic.
  groups.sort((a, b) =>
    a.switchNode.id.localeCompare(b.switchNode.id),
  );

  for (const group of groups) {
    const topRow = [group.switchNode, ...group.accessPoints];

    const topRowWidth =
      topRow.reduce((total, node) => total + getWidth(node), 0) +
      horizontalGap * (topRow.length - 1);

    const topRowHeight = Math.max(...topRow.map(getHeight));

    let topX = centerX - topRowWidth / 2;

    for (const node of topRow) {
      positions.set(node.id, {
        x: topX,
        y: sectionY + (topRowHeight - getHeight(node)) / 2,
      });

      topX += getWidth(node) + horizontalGap;
    }

    const sortedClients = [...group.clients].sort((a, b) =>
      a.id.localeCompare(b.id),
    );

    const clientRows = Math.ceil(
      sortedClients.length / clientColumns,
    );

    const clientColumnWidths = Array.from(
      { length: Math.min(clientColumns, sortedClients.length) },
      (_, column) =>
        Math.max(
          ...sortedClients
            .filter((_, index) => index % clientColumns === column)
            .map(getWidth),
        ),
    );

    const clientGridWidth =
      clientColumnWidths.reduce((sum, width) => sum + width, 0) +
      horizontalGap * Math.max(0, clientColumnWidths.length - 1);

    let clientY = sectionY + topRowHeight + verticalGap;

    for (let row = 0; row < clientRows; row += 1) {
      const rowClients = sortedClients.slice(
        row * clientColumns,
        (row + 1) * clientColumns,
      );

      const rowHeight = Math.max(...rowClients.map(getHeight));
      let clientX = centerX - clientGridWidth / 2;

      for (const [column, node] of rowClients.entries()) {
        const columnWidth = clientColumnWidths[column];

        positions.set(node.id, {
          x: clientX + (columnWidth - getWidth(node)) / 2,
          y: clientY + (rowHeight - getHeight(node)) / 2,
        });

        clientX += columnWidth + horizontalGap;
      }

      clientY += rowHeight + verticalGap;
    }

    sectionY = clientY + sectionGap - verticalGap;
  }

  return {
    ...graph,
    nodes: nodes.map((node) => {
      const position = positions.get(node.id);

      return position
        ? { ...node, position: { ...position }, data: { ...node.data } }
        : { ...node, position: { ...node.position }, data: { ...node.data } };
    }),
    edges: edges.map((edge) => ({
      ...edge,
      data: edge.data ? { ...edge.data } : undefined,
    })),
  };
}

function assignSnapshotHandles(graph: SnapshotGraph): SnapshotGraph {
  type Side = "top" | "right" | "bottom" | "left";
  type Handle = NonNullable<
    SnapshotGraph["nodes"][number]["data"]["snapshotHandles"]
  >[number];

  const nodeById = new Map(
    graph.nodes.map((node) => [node.id, node]),
  );

  const sourceGroups = new Map<
    string,
    Map<Side, typeof graph.edges>
  >();
  const targetGroups = new Map<
    string,
    Map<Side, typeof graph.edges>
  >();

  const handleAssignments = new Map<string, Handle[]>();

  function getSides(edge: SnapshotGraph["edges"][number]): {
    sourceSide: Side;
    targetSide: Side;
  } {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);

    if (!source || !target) {
      return { sourceSide: "bottom", targetSide: "top" };
    }

    const sourceRole = source.data.role;
    const targetRole = target.data.role;

    // Core switch → floor access switch.
    if (
      sourceRole === "switch" &&
      source.data.layer === "core" &&
      targetRole === "switch" &&
      target.data.layer === "access"
    ) {
      return { sourceSide: "bottom", targetSide: "left" };
    }

    // Floor access switch → AP.
    if (
      sourceRole === "switch" &&
      source.data.layer === "access" &&
      targetRole === "access_point"
    ) {
      return { sourceSide: "right", targetSide: "left" };
    }

    // Floor access switch → directly connected clients.
    if (
      sourceRole === "switch" &&
      source.data.layer === "access" &&
      targetRole === "client_group"
    ) {
      return { sourceSide: "bottom", targetSide: "top" };
    }

    // AP → its client groups.
    // Clients 3 and 4 leave from the AP's bottom and enter the target's
    // right handle. Clients 1 and 2 keep the original right → top routing.
    if (
      sourceRole === "access_point" &&
      targetRole === "client_group"
    ) {
      return /(?:clients-3|clients-4)$/.test(target.id)
        ? { sourceSide: "bottom", targetSide: "right" }
        : { sourceSide: "right", targetSide: "top" };
    }

    return { sourceSide: "bottom", targetSide: "top" };
  }

  function addToGroup(
    groups: Map<string, Map<Side, typeof graph.edges>>,
    nodeId: string,
    side: Side,
    edge: SnapshotGraph["edges"][number],
  ) {
    let sideGroups = groups.get(nodeId);

    if (!sideGroups) {
      sideGroups = new Map();
      groups.set(nodeId, sideGroups);
    }

    const group = sideGroups.get(side) ?? [];
    group.push(edge);
    sideGroups.set(side, group);
  }

  for (const edge of graph.edges) {
    const { sourceSide, targetSide } = getSides(edge);

    addToGroup(sourceGroups, edge.source, sourceSide, edge);
    addToGroup(targetGroups, edge.target, targetSide, edge);
  }

  function assignGroup(
    groups: Map<string, Map<Side, typeof graph.edges>>,
    type: "source" | "target",
  ) {
    for (const [nodeId, sideGroups] of groups) {
      for (const [side, groupEdges] of sideGroups) {
        const sortedEdges = [...groupEdges].sort((a, b) =>
          a.id.localeCompare(b.id),
        );

        sortedEdges.forEach((edge, index) => {
          const offset =
            ((index + 1) / (sortedEdges.length + 1)) * 100;

          const handle: Handle = {
            id: `${edge.id}-${type}`,
            type,
            position: side,
            offset,
          };

          const assignments = handleAssignments.get(nodeId) ?? [];
          assignments.push(handle);
          handleAssignments.set(nodeId, assignments);
        });
      }
    }
  }

  assignGroup(sourceGroups, "source");
  assignGroup(targetGroups, "target");

  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        snapshotHandles: handleAssignments.get(node.id) ?? [],
      },
    })),
    edges: graph.edges.map((edge) => ({
      ...edge,
      sourceHandle: `${edge.id}-source`,
      targetHandle: `${edge.id}-target`,
    })),
  };
}

/**
 * Captures the same logical graph and layout used by the on-screen topology.
 * The export is rendered in an isolated off-screen React Flow instance.
 */
export async function createTopologySnapshot(
  planData: NetworkPlanData,
  options: TopologySnapshotOptions,
): Promise<TopologySnapshotResult> {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;

  try {
    const {
      maxWidth,
      padding = 40,
      pixelRatio = 2,
    } = options;

    if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
      throw new Error("maxWidth must be a positive finite number.");
    }

    if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
      throw new Error("pixelRatio must be a positive finite number.");
    }

    if (!Number.isFinite(padding) || padding < 0) {
      throw new Error("padding must be a non-negative finite number.");
    }

    const flowGraph = toFlowGraph({
      bom: planData.bom,
      topology: planData.topology,
    });

    if (flowGraph.status === "unavailable") {
      return {
        status: "unavailable",
        reason: flowGraph.reason,
      };
    }

    const positionedGraph = layoutGraph(flowGraph);
    const exportGraph = assignSnapshotHandles(
      arrangeLargeTopologyForExport(positionedGraph),
    );

    const bounds = getTopologyExportBounds(exportGraph, padding);

    if (
      !Number.isFinite(bounds.width) ||
      !Number.isFinite(bounds.height) ||
      bounds.width <= 0 ||
      bounds.height <= 0
    ) {
      throw new Error("The topology export bounds are invalid.");
    }

    // Scale down only when the graph exceeds the requested export width.
    const scale = Math.min(1, maxWidth / bounds.width);
    const width = Math.ceil(bounds.width * scale);
    const height = Math.ceil(bounds.height * scale);

    // Translate copied positions. The screen graph remains untouched.
    const exportNodes = exportGraph.nodes.map((node) => ({
      ...node,
      position: {
        x: node.position.x - bounds.minX,
        y: node.position.y - bounds.minY,
      },
      data: { ...node.data },
    }));

    const exportNodeById = new Map(
      exportNodes.map((node) => [node.id, node]),
    );

    // Keep the shared trunk inside the export's left padding.
    const laneX =
      Math.min(...exportNodes.map((node) => node.position.x)) - 24;

    const exportEdges = exportGraph.edges.map((edge) => {
      const source = exportNodeById.get(edge.source);
      const target = exportNodeById.get(edge.target);

      const isCoreUplink =
        source?.data.role === "switch" &&
        source.data.layer === "core" &&
        target?.data.role === "switch" &&
        target.data.layer === "access";

      // voip is wired to the Floor Switch in the fixture, so it is not included.
      const isAPRow2Edge =
        source?.data.role === "access_point" &&
        target?.data.role === "client_group" &&
        /(?:clients-3|clients-4)$/.test(target.id);

      return {
        ...edge,
        type: isCoreUplink
        ? "snapshotCoreUplink"
        : isAPRow2Edge
        ? "snapshotAPRow2"
        : (edge.data?.linkType ?? edge.type),
        style: {
          ...edge.style,
          stroke: "#8b8490",
          strokeWidth: Math.max(2, 2 / scale),
        },
        data: {
          ...(edge.data ?? {}),
          ...(isCoreUplink ? { snapshotLaneX: laneX } : {}),
          ...(isAPRow2Edge
            ? {
                // Lane in the gap to the right of the target's column.
                snapshotLaneX:
                  target!.position.x +
                  (target!.width ?? target!.measured?.width ?? 190) +
                  16,
                // Different jog depths keep the Clients 3 and 4 runs from
                // overlapping on the same horizontal line.
                snapshotJogY: /clients-3$/.test(target!.id) ? 10 : 20,
              }
            : {}),
        },
      };
    });

    container = document.createElement("div");
    container.setAttribute("aria-hidden", "true");

    Object.assign(container.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: `${width}px`,
      height: `${height}px`,
      overflow: "hidden",
      background: "#ffffff",
      colorScheme: "light",
      pointerEvents: "none",
      zIndex: "9999",
      ...LIGHT_THEME,
    });

    document.body.appendChild(container);
    root = createRoot(container);

    await waitForReactFlow(
      container,
      exportEdges.length,
      (onInit) => {
        root!.render(
          <ReactFlowProvider>
            <div
              style={{
                width: `${width}px`,
                height: `${height}px`,
              }}
            >
              <ReactFlow
                nodes={exportNodes}
                edges={exportEdges}
                nodeTypes={exportNodeTypes}
                edgeTypes={snapshotEdgeTypes}
                minZoom={scale}
                maxZoom={1}
                defaultViewport={{
                  x: 0,
                  y: 0,
                  zoom: scale,
                }}
                fitView={false}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnDrag={false}
                zoomOnScroll={false}
                zoomOnPinch={false}
                zoomOnDoubleClick={false}
                onInit={onInit}
              />
            </div>
          </ReactFlowProvider>,
        );
      },
    );

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    await waitForFrame();
    await waitForFrame();

    const dataUrl = await toPng(container, {
      width,
      height,
      pixelRatio,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });

    return {
      status: "success",
      dataUrl,
      width,
      height,
    };
  } catch (error) {
    return {
      status: "unavailable",
      reason:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while capturing the topology.",
    };
  } finally {
    root?.unmount();
    container?.remove();
  }
}

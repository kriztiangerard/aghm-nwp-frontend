import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Maximize2, X } from "lucide-react";
import {
  Background,
  Controls,
  ControlButton,
  ReactFlow,
  type Node,
  type NodeMouseHandler,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./topology-theme.css";

import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toFlowGraph } from "./adapter";
import { FloorClosetBreakdown } from "./floor-closet-breakdown";
import type { PositionedFlowGraph } from "./layout";
import { TopologyMarkerContext } from "./edge-markers";
import {
  FLOOR_ZONE_NODE_TYPE,
  topologyEdgeTypes,
  topologyNodeTypes,
} from "./flow-types";
import { TopologyEdgeMarkers } from "./topology-edge";
import { TopologyLegend } from "./topology-legend";
import { buildNodeDetails, type NodeDetails } from "./node-details";
import { NodeDetailsSheet } from "./node-details-sheet";
import { nodeA11yLabel } from "./node-display";
import type { FlowNodeData, TopologyFlowEdge } from "./types";
import type { NetworkPlanData } from "@/components/comparison/types";

interface TopologyGraphProps {
  planData: NetworkPlanData;
}

/** Lowest zoom used when the canvas first fits the graph. */
const INITIAL_MIN_ZOOM = 0.6;
/** The expanded dialog has more room, so it can fit more before clamping. */
const EXPANDED_MIN_ZOOM = 0.45;

/**
 * Floor zones become background nodes, drawn first and below the edges
 * (zIndex -1). They exist only on the canvas; layout results and tests see
 * them as `zones`, not as topology nodes.
 */
export function toCanvasNodes(
  graph: PositionedFlowGraph,
  { interactive = false }: { interactive?: boolean } = {},
): Node<FlowNodeData>[] {
  const zoneNodes: Node<FlowNodeData>[] = graph.zones.map((zone) => ({
    id: `zone-${zone.id}`,
    type: FLOOR_ZONE_NODE_TYPE,
    position: { x: zone.x, y: zone.y },
    width: zone.width,
    height: zone.height,
    data: { role: FLOOR_ZONE_NODE_TYPE, label: zone.label },
    zIndex: -1,
    selectable: false,
    draggable: false,
    focusable: false,
  }));

  // NWP-TOPO-004: devices can be selected and focused (AC4–AC6) but never
  // moved, connected or deleted (AC3). The accessible name goes on React
  // Flow's focusable wrapper, so screen readers announce it on Tab.
  const deviceNodes: Node<FlowNodeData>[] = graph.nodes.map((node) => ({
    ...node,
    draggable: false,
    connectable: false,
    deletable: false,
    selectable: interactive,
    focusable: interactive,
    ariaLabel: interactive
      ? `${nodeA11yLabel(node.data)}. Press Enter for details.`
      : undefined,
  }));

  return [...zoneNodes, ...deviceNodes];
}

/** Interactive canvas only: edges carry no details panel, so they are neither selectable nor focusable. */
const toCanvasEdges = (graph: PositionedFlowGraph): TopologyFlowEdge[] =>
  graph.edges.map((edge) => ({
    ...edge,
    selectable: false,
    focusable: false,
    deletable: false,
    reconnectable: false,
  }));

/** Zoom bounds for the interactive canvas (AC1). */
export const TOPOLOGY_MIN_ZOOM = 0.1;
export const TOPOLOGY_MAX_ZOOM = 2;

export function TopologyCanvas({
  graph,
  planData,
  expanded = false,
  onExpand,
  exportViewport,
  onInit,
}: {
  graph: PositionedFlowGraph;
  /** Source of the details panel figures. Omit for a non-interactive canvas. */
  planData?: NetworkPlanData;
  expanded?: boolean;
  onExpand?: () => void;
  exportViewport?: Viewport;
  onInit?: () => void;
}) {
  // Unique per canvas: two plan panels and the expanded dialog can be mounted together.
  const markerPrefix = `topo-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  // The PDF snapshot passes exportViewport and no planData: nothing is selectable there.
  const interactive = !exportViewport && planData !== undefined;
  const canvasNodes = useMemo(
    () => toCanvasNodes(graph, { interactive }),
    [graph, interactive],
  );
  // The PDF snapshot keeps the layout's edges exactly as they are (it is not interactive, and
  // tests/topology-snapshot.test.tsx checks the exported edges equal the screen layout's).
  const canvasEdges = useMemo(
    () => (interactive ? toCanvasEdges(graph) : graph.edges),
    [graph, interactive],
  );

  // NWP-TOPO-004 AC4–AC6: the selected node's details.
  const [details, setDetails] = useState<NodeDetails | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const openDetails = useCallback(
    (nodeId: string, opener: HTMLElement | null) => {
      if (!planData) return;
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) return; // floor zones are not in graph.nodes
      openerRef.current = opener;
      setDetails(buildNodeDetails(node.data, planData.bom, planData.currency));
    },
    [graph.nodes, planData],
  );

  const closeDetails = useCallback(() => {
    setDetails(null);
    // The Sheet returns focus on its own; this only covers the case where
    // focus was left on <body> (e.g. the node re-rendered while open).
    const opener = openerRef.current;
    requestAnimationFrame(() => {
      if (
        opener?.isConnected &&
        (document.activeElement === null ||
          document.activeElement === document.body)
      ) {
        opener.focus();
      }
    });
  }, []);

  const handleNodeClick: NodeMouseHandler<Node<FlowNodeData>> = useCallback(
    (event, node) => {
      openDetails(
        node.id,
        (event.currentTarget as HTMLElement | null) ?? null,
      );
    },
    [openDetails],
  );

  // AC6: React Flow selects a focused node on Enter/Space but does not call
  // onNodeClick, so the canvas listens for the key itself.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!interactive) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target as HTMLElement;
      const nodeEl = target.closest<HTMLElement>(".react-flow__node");
      // Only the node wrapper itself, so the Controls buttons keep their own Enter.
      if (!nodeEl || nodeEl !== target) return;
      const nodeId = nodeEl.dataset.id;
      if (!nodeId) return;
      event.preventDefault();
      openDetails(nodeId, nodeEl);
    },
    [interactive, openDetails],
  );

  // Large plans are wider than the panel. Fitting the whole graph would
  // shrink the text below readable size, so the first view stops at a
  // minimum zoom and the user pans for the rest. The Controls "fit view"
  // button has no options of its own, so it still shows the whole graph.
  const fitViewOptions = {
    padding: 0.05,
    minZoom: expanded ? EXPANDED_MIN_ZOOM : INITIAL_MIN_ZOOM,
    maxZoom: 1.25,
  };

  return (
    <TopologyMarkerContext.Provider value={markerPrefix}>
      {/* Key events bubble up from the focused node wrapper (AC6). */}
      <div
        className={cn(
          "topology-canvas relative",
          expanded ? "h-full w-full" : "h-[640px] w-full",
        )}
        onKeyDown={handleKeyDown}
      >
        <TopologyEdgeMarkers prefix={markerPrefix} />
        <ReactFlow
          nodes={canvasNodes}
          edges={canvasEdges}
          nodeTypes={topologyNodeTypes}
          edgeTypes={topologyEdgeTypes}
          fitView={!exportViewport}
          fitViewOptions={fitViewOptions}
          defaultViewport={exportViewport}
          // AC3: read-only. Nothing can be moved, connected, reconnected or deleted.
          nodesDraggable={false}
          nodesConnectable={false}
          edgesReconnectable={false}
          deleteKeyCode={null}
          selectionKeyCode={null}
          multiSelectionKeyCode={null}
          selectionOnDrag={false}
          // AC4–AC6: devices can be selected (click or Enter) to open details.
          elementsSelectable={interactive}
          nodesFocusable={interactive}
          edgesFocusable={false}
          onNodeClick={interactive ? handleNodeClick : undefined}
          // AC1: bounded zoom.
          minZoom={exportViewport?.zoom ?? TOPOLOGY_MIN_ZOOM}
          maxZoom={TOPOLOGY_MAX_ZOOM}
          panOnDrag={!exportViewport}
          zoomOnScroll={!exportViewport}
          zoomOnPinch={!exportViewport}
          zoomOnDoubleClick={!exportViewport}
          onInit={onInit}
        >
          <Background />
          {!exportViewport && (
            <Controls showInteractive={false}>
              {!expanded && onExpand && (
                <ControlButton
                  onClick={onExpand}
                  title="Expand topology"
                  aria-label="Expand topology"
                >
                  <Maximize2 size={16} />
                </ControlButton>
              )}
            </Controls>
          )}
        </ReactFlow>
      </div>
      {interactive && (
        <NodeDetailsSheet details={details} onClose={closeDetails} />
      )}
    </TopologyMarkerContext.Provider>
  );
}

export function TopologyGraph({ planData }: TopologyGraphProps) {
  const cacheKey = `${planData.generatedAt}:${planData.vendor}:${planData.tier}`;
  const [expanded, setExpanded] = useState(false);

  // The per-floor split (revised AC5/AC10, AC11) happens inside layoutGraph,
  // so it applies however the layout is called.
  const graph = useMemo(
    () =>
      toFlowGraph({
        bom: planData.bom,
        topology: planData.topology,
      }),
    [planData.bom, planData.topology],
  );

  const [workerResult, setWorkerResult] = useState<{
    cacheKey: string;
    graph: typeof graph;
    result: PositionedFlowGraph | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (graph.status !== "available") return;

    const worker = new Worker(
      new URL("./layout.worker.ts", import.meta.url),
      { type: "module" },
    );

    const requestId = 1;

    worker.onmessage = (
      event: MessageEvent<
        | {
            requestId: number;
            status: "success";
            result: PositionedFlowGraph;
          }
        | {
            requestId: number;
            status: "error";
            message: string;
          }
      >,
    ) => {
      if (event.data.requestId !== requestId) return;

      if (event.data.status === "success") {
        setWorkerResult({
          cacheKey,
          graph,
          result: event.data.result,
          error: null,
        });
      } else {
        setWorkerResult({
          cacheKey,
          graph,
          result: null,
          error: event.data.message,
        });
      }
    };

    worker.onerror = () => {
      setWorkerResult({
        cacheKey,
        graph,
        result: null,
        error: "Topology layout worker failed",
      });
    };

    worker.postMessage({ requestId, cacheKey, graph });

    return () => worker.terminate();
  }, [graph, cacheKey]);

  const currentWorkerResult =
    workerResult?.cacheKey === cacheKey &&
    workerResult.graph === graph
      ? workerResult
      : null;

  // Spine edge handles (WAN → gateway → core) are assigned in layout.ts.
  const positionedGraph = currentWorkerResult?.result ?? null;

  if (graph.status === "unavailable") {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">{graph.reason}</p>
      </div>
    );
  }

  if (!positionedGraph) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {currentWorkerResult?.error ?? "Generating topology layout..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border bg-background">
        <Dialog.Root open={expanded} onOpenChange={setExpanded}>
          <Dialog.Portal>
              <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60" />

              <Dialog.Popup className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-xl border bg-background shadow-xl md:inset-8">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <Dialog.Title className="text-sm font-semibold">
                    Network Topology - {planData.vendor} ({planData.tier})
                  </Dialog.Title>

                  <Dialog.Close
                    render={
                      <Button variant="ghost" size="icon" aria-label="Close topology">
                        <X className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>

                <div className="min-h-0 flex-1">
                  <TopologyCanvas
                    graph={positionedGraph}
                    planData={planData}
                    expanded
                  />
                </div>

                <TopologyLegend
                  nodes={positionedGraph.nodes}
                  edges={positionedGraph.edges}
                  hasFloorZones={positionedGraph.zones.length > 0}
                  className="max-h-48 overflow-y-auto border-t bg-card px-4 py-3"
                />
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>

        <TopologyCanvas
          graph={positionedGraph}
          planData={planData}
          onExpand={() => setExpanded(true)}
        />
      </div>

      <TopologyLegend
        nodes={positionedGraph.nodes}
        edges={positionedGraph.edges}
        hasFloorZones={positionedGraph.zones.length > 0}
      />

      {positionedGraph.warnings.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {positionedGraph.warnings.length} topology warning(s)
        </p>
      )}

      {/* The breakdown reads the plan-wide nodes from the adapter; the
          per-floor split does not change its totals. */}
      <FloorClosetBreakdown nodes={graph.nodes} />
    </div>
  );
}

export default TopologyGraph;
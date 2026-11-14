
import { useEffect, useMemo, useState } from "react";
import {
  Globe,
  Router,
  Shield,
  Server,
  Network,
  Wifi,
  Monitor,
  Maximize2,
  X,
} from "lucide-react";
import {
  Background,
  Controls,
  ControlButton,
  SmoothStepEdge,
  Handle,
  Position,
  ReactFlow,
  type Node,
  type NodeProps,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { toFlowGraph } from "./adapter";
import { FloorClosetBreakdown } from "./floor-closet-breakdown";
import type { PositionedFlowGraph } from "./layout";
import type { FlowNodeData } from "./types";
import type { NetworkPlanData } from "@/components/comparison/types";

interface TopologyGraphProps {
  planData: NetworkPlanData;
}

const DEVICE_ICONS = {
  wan: Globe,
  gateway: Router,
  firewall: Shield,
  controller: Server,
  switch: Network,
  access_point: Wifi,
  client_group: Monitor,
} as const;

function TopologyNodeView({ data }: NodeProps<Node<FlowNodeData>>) {
  const Icon =
    DEVICE_ICONS[data.role as keyof typeof DEVICE_ICONS] ?? Network;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border bg-card px-2 py-2 text-center shadow-sm">
      <Handle type="target" position={Position.Top} />

      <Icon className="mb-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />

      <p className="max-w-full truncate text-xs font-semibold">
        {data.label}
      </p>

      {data.sku && (
        <p className="max-w-full truncate text-[10px] text-muted-foreground">
          {data.sku}
        </p>
      )}

      {data.qty !== undefined && (
        <p className="text-[10px]">Qty: {data.qty}</p>
      )}

      {data.count !== undefined && data.count !== null && (
        <p className="text-[10px]">Devices: {data.count}</p>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  wan: TopologyNodeView,
  gateway: TopologyNodeView,
  firewall: TopologyNodeView,
  controller: TopologyNodeView,
  switch: TopologyNodeView,
  access_point: TopologyNodeView,
  client_group: TopologyNodeView,
  default: TopologyNodeView,
};

const edgeTypes: EdgeTypes = {
  wan: SmoothStepEdge,
  uplink: SmoothStepEdge,
  poe: SmoothStepEdge,
  access: SmoothStepEdge,
  management: SmoothStepEdge,
};

function TopologyCanvas({
  graph,
  expanded = false,
  onExpand,
}: {
  graph: PositionedFlowGraph;
  expanded?: boolean;
  onExpand?: () => void;
}) {
  return (
    <div className={expanded ? "h-full w-full" : "h-80 w-full"}>
      <ReactFlow
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
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
      </ReactFlow>
    </div>
  );
}

export function TopologyGraph({ planData }: TopologyGraphProps) {
  const cacheKey = `${planData.generatedAt}:${planData.vendor}:${planData.tier}`;
  const [expanded, setExpanded] = useState(false);

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

  if (graph.status === "unavailable") {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">{graph.reason}</p>
      </div>
    );
  }

  const positionedGraph = currentWorkerResult?.result;

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
                  <TopologyCanvas graph={positionedGraph} expanded />
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>

        <TopologyCanvas
          graph={positionedGraph}
          onExpand={() => setExpanded(true)}
        />
      </div>

      {positionedGraph.warnings.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {positionedGraph.warnings.length} topology warning(s)
        </p>
      )}

      <FloorClosetBreakdown nodes={graph.nodes} />
    </div>
  );
}

export default TopologyGraph;

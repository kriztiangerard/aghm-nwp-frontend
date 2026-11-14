
import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
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

import { toFlowGraph } from "./adapter";
import { FloorClosetBreakdown } from "./floor-closet-breakdown";
import type { PositionedFlowGraph } from "./layout";
import type { FlowNodeData } from "./types";
import type { NetworkPlanData } from "@/components/comparison/types";

interface TopologyGraphProps {
  planData: NetworkPlanData;
}

function TopologyNodeView({
  data,
}: NodeProps<Node<FlowNodeData>>) {
  return (
    <div className="min-w-[150px] max-w-[210px] rounded-lg border bg-card px-3 py-3 text-center shadow-sm">
      <Handle type="target" position={Position.Top} />

      <p className="text-sm font-semibold">{data.label}</p>

      {data.name && (
        <p className="mt-1 text-xs text-muted-foreground">
          {data.name}
        </p>
      )}

      {data.sku && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {data.sku}
        </p>
      )}

      {data.qty !== undefined && (
        <p className="mt-1 text-xs">
          Quantity: {data.qty}
        </p>
      )}

      {data.count !== undefined && data.count !== null && (
        <p className="mt-1 text-xs">
          Devices: {data.count}
        </p>
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

export function TopologyGraph({ planData }: TopologyGraphProps) {
  const cacheKey = `${planData.generatedAt}:${planData.vendor}:${planData.tier}`;

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

    worker.postMessage({
      requestId,
      cacheKey,
      graph,
    });

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
        <p className="text-sm text-muted-foreground">
          {graph.reason}
        </p>
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
      <div className="h-80 w-full overflow-hidden rounded-lg border bg-background">
      <ReactFlow
        nodes={positionedGraph.nodes}
        edges={positionedGraph.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background />
        <Controls />
      </ReactFlow>

      {positionedGraph.warnings.length > 0 && (
        <p className="border-t px-3 py-2 text-xs text-muted-foreground">
          {positionedGraph.warnings.length} topology warning(s)
        </p>
      )}
      </div>
      <FloorClosetBreakdown nodes={graph.nodes} />
    </div>
  );
}

export default TopologyGraph;

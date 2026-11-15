
import { useEffect, useMemo, useState } from "react";
import {
  Maximize2,
  X,
} from "lucide-react";
import {
  Background,
  Controls,
  ControlButton,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { toFlowGraph } from "./adapter";
import { FloorClosetBreakdown } from "./floor-closet-breakdown";
import { nodeTypes, edgeTypes } from "./topology-renderers";
import type { PositionedFlowGraph } from "./layout";
import type { NetworkPlanData } from "@/components/comparison/types";

interface TopologyGraphProps {
  planData: NetworkPlanData;
}

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
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Close topology"
                    >
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

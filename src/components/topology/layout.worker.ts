
import { layoutGraph } from "./layout";
import type {
  TopologyFlowEdge,
  TopologyFlowNode,
  TopologyWarning,
} from "./types";

interface LayoutWorkerRequest {
  requestId: number;
  cacheKey: string;
  graph: {
    nodes: TopologyFlowNode[];
    edges: TopologyFlowEdge[];
    warnings: TopologyWarning[];
  };
}

type LayoutWorkerResponse =
  | {
      requestId: number;
      status: "success";
      result: ReturnType<typeof layoutGraph>;
      /** NWP-TOPO-006: time spent in layoutGraph, for the dev timing log. */
      layoutMs: number;
    }
  | {
      requestId: number;
      status: "error";
      message: string;
    };

self.onmessage = (event: MessageEvent<LayoutWorkerRequest>) => {
  const { requestId, cacheKey, graph } = event.data;

  try {
    const started = performance.now();
    const result = layoutGraph(graph, cacheKey);
    const layoutMs = performance.now() - started;

    const response: LayoutWorkerResponse = {
      requestId,
      status: "success",
      result,
      layoutMs,
    };

    self.postMessage(response);
  } catch (error) {
    const response: LayoutWorkerResponse = {
      requestId,
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Topology layout failed",
    };

    self.postMessage(response);
  }
};

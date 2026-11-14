
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
    }
  | {
      requestId: number;
      status: "error";
      message: string;
    };

self.onmessage = (event: MessageEvent<LayoutWorkerRequest>) => {
  const { requestId, cacheKey, graph } = event.data;

  try {
    const result = layoutGraph(graph, cacheKey);

    const response: LayoutWorkerResponse = {
      requestId,
      status: "success",
      result,
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

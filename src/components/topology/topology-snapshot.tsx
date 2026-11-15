
import { createRoot, type Root } from "react-dom/client";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { toPng } from "html-to-image";
import type { NetworkPlanData } from "@/components/comparison/types";
import { toFlowGraph } from "./adapter";
import { layoutGraph } from "./layout";
import { getTopologyExportBounds } from "./topology-export-bounds";
import { edgeTypes, exportNodeTypes } from "./topology-renderers";

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

async function waitForReactFlow(
  root: HTMLElement,
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
    const { maxWidth, padding = 40, pixelRatio = 2 } = options;

    if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
      throw new Error("maxWidth must be a positive finite number.");
    }

    if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
      throw new Error("pixelRatio must be a positive finite number.");
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
    const bounds = getTopologyExportBounds(positionedGraph, padding);

    // Scale down only when the graph exceeds the requested export width.
    const scale = Math.min(1, maxWidth / bounds.width);
    const width = Math.ceil(bounds.width * scale);
    const height = Math.ceil(bounds.height * scale);

    // Translate copied positions. The screen graph remains untouched.
    const exportNodes = positionedGraph.nodes.map((node) => ({
      ...node,
      position: {
        x: node.position.x - bounds.minX,
        y: node.position.y - bounds.minY,
      },
      data: { ...node.data },
    }));

    const exportEdges = positionedGraph.edges.map((edge) => ({
      ...edge,
      data: edge.data ? { ...edge.data } : undefined,
    }));

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
      zIndex: "-1",
      ...LIGHT_THEME,
    });

    document.body.appendChild(container);
    root = createRoot(container);

    await waitForReactFlow(container, (onInit) => {
      root!.render(
        <ReactFlowProvider>
          <div style={{ width: `${width}px`, height: `${height}px` }}>
            <ReactFlow
              nodes={exportNodes}
              edges={exportEdges}
              nodeTypes={exportNodeTypes}
              edgeTypes={edgeTypes}
              minZoom={scale}
              maxZoom={1}
              defaultViewport={{ x: 0, y: 0, zoom: scale }}
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
    });

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

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

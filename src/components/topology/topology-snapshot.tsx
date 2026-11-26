import { createRoot, type Root } from "react-dom/client";
import { ReactFlowProvider } from "@xyflow/react";
import { toPng } from "html-to-image";
import type { NetworkPlanData } from "@/components/comparison/types";
import { toFlowGraph } from "./adapter";
import { layoutGraph } from "./layout";
import { getTopologyExportBounds } from "./topology-export-bounds";
import { TopologyCanvas, toCanvasNodes } from "./topology-graph";
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
    let settled = false;

    const complete = () => {
      if (settled) return;
      settled = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      resolve();
    };

    const frameId = window.requestAnimationFrame(complete);

    // Background tabs may pause requestAnimationFrame indefinitely.
    // Keep PDF snapshot generation moving when the source tab is inactive.
    const timeoutId = window.setTimeout(complete, 100);
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
    const bounds = getTopologyExportBounds(
      { ...positionedGraph, nodes: toCanvasNodes(positionedGraph) },
      padding,
    );

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

    container = document.createElement("div");
    container.className = "topology-snapshot";
    container.setAttribute("aria-hidden", "true");

    Object.assign(container.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: `${width}px`,
      height: `${height}px`,
      overflow: "hidden",
      background: "#ffffff",
      // Without this, text would inherit the dark page's near-white colour.
      color: "var(--foreground)",
      colorScheme: "light",
      pointerEvents: "none",
      zIndex: "-1",
    });

    for (const [property, value] of Object.entries(LIGHT_THEME)) {
      container.style.setProperty(property, value);
    }

    document.body.appendChild(container);
    root = createRoot(container);

    await waitForReactFlow(container, positionedGraph.edges.length, (onInit) => {
      root!.render(
        <ReactFlowProvider>
          <TopologyCanvas
            graph={positionedGraph}
            expanded
            exportViewport={{
              x: -bounds.minX * scale || 0,
              y: -bounds.minY * scale || 0,
              zoom: scale,
            }}
            onInit={onInit}
          />
        </ReactFlowProvider>,
      );
    });

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

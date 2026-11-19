// @vitest-environment jsdom

import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NetworkPlanData } from "@/components/comparison/types";
import { createTopologySnapshot } from "@/components/topology/topology-snapshot";
import "@xyflow/react/dist/style.css";
import { topo002StressScenario } from "@/components/comparison/topo002-stress-fixture";
import { toFlowGraph } from "@/components/topology/adapter";
import { layoutGraph } from "@/components/topology/layout";
import { toCanvasNodes } from "@/components/topology/topology-graph";

const mocks = vi.hoisted(() => ({
  toPng: vi.fn(),
  reactFlowProps: vi.fn(),
}));

vi.mock("html-to-image", () => ({
  toPng: mocks.toPng,
}));

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@xyflow/react")>();
  const React = await import("react");

  return {
    ...actual,

    ReactFlowProvider: ({
      children,
    }: {
      children: ReactNode;
    }) => React.createElement(React.Fragment, null, children),

    ReactFlow: ({
      nodes,
      edges,
      onInit,
      ...props
    }: {
      nodes: Array<{ id: string }>;
      edges: Array<{ id: string }>;
      onInit?: (instance: unknown) => void;
      [key: string]: unknown;
    }) => {
      mocks.reactFlowProps({
        nodes,
        edges,
        ...props,
      });

      onInit?.({});

      return React.createElement(
        "div",
        null,

        ...nodes.map((node) =>
          React.createElement("div", {
            className: "react-flow__node",
            key: node.id,
          }),
        ),

        React.createElement(
          "svg",
          null,
          ...edges.map((edge) =>
            React.createElement(
              "g",
              {
                className: "react-flow__edge",
                key: edge.id,
              },
              React.createElement("path", {
                className: "react-flow__edge-path",
                d: "M 0 0 L 100 100",
              }),
            ),
          ),
        ),
      );
    },
  };
});

const planData: NetworkPlanData = {
  vendor: "TP-Link Omada",
  tier: "Cost-Efficient",
  topology: {
    nodes: [
      {
        id: "gateway-1",
        role: "gateway",
        layer: "core",
        label: "Gateway",
        sku: "ER7206",
        qty: 1,
      },
      {
        id: "switch-1",
        role: "switch",
        layer: "access",
        label: "Switch",
        sku: "SG2210P",
        qty: 1,
      },
    ],
    edges: [
      {
        id: "edge-1",
        source: "gateway-1",
        target: "switch-1",
        type: "uplink",
      },
    ],
  },
  bom: [
    {
      sku: "ER7206",
      name: "Omada Gigabit VPN Router",
      category: "Gateway",
      quantity: 1,
      unitPrice: 1,
      subtotal: 1,
      priceSource: "manual",
      isStale: false,
      priceUpdatedAt: null,
      isGeneric: false,
    },
    {
      sku: "SG2210P",
      name: "Omada JetStream PoE Switch",
      category: "Switch",
      quantity: 1,
      unitPrice: 1,
      subtotal: 1,
      priceSource: "manual",
      isStale: false,
      priceUpdatedAt: null,
      isGeneric: false,
    },
  ],
  totalCost: 2,
  totalIsPartial: false,
  complete: true,
  unmet: [],
  generatedAt: "2026-11-15T00:00:00.000Z",
  currency: "PHP",
};

describe("createTopologySnapshot", () => {
  beforeEach(() => {
    mocks.toPng.mockReset();
    mocks.reactFlowProps.mockReset();

    mocks.toPng.mockResolvedValue(
      "data:image/png;base64,dGVzdA==",
    );

    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: (callback: FrameRequestCallback) =>
        window.setTimeout(
          () => callback(performance.now()),
          0,
        ),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("returns unavailable when topology is missing", async () => {
    const result = await createTopologySnapshot(
      { ...planData, topology: null },
      { maxWidth: 1200 },
    );

    expect(result.status).toBe("unavailable");
    expect(mocks.toPng).not.toHaveBeenCalled();
  });

  it("returns unavailable when maxWidth is invalid", async () => {
    const result = await createTopologySnapshot(
      planData,
      { maxWidth: 0 },
    );

    expect(result.status).toBe("unavailable");

    if (result.status === "unavailable") {
      expect(result.reason).toContain("maxWidth");
    }

    expect(mocks.toPng).not.toHaveBeenCalled();
  });

  it("returns unavailable when pixelRatio is invalid", async () => {
    const result = await createTopologySnapshot(
      planData,
      {
        maxWidth: 1200,
        pixelRatio: 0,
      },
    );

    expect(result.status).toBe("unavailable");

    if (result.status === "unavailable") {
      expect(result.reason).toContain("pixelRatio");
    }

    expect(mocks.toPng).not.toHaveBeenCalled();
  });

  it("returns unavailable when padding is invalid", async () => {
    const result = await createTopologySnapshot(
      planData,
      {
        maxWidth: 1200,
        padding: -1,
      },
    );

    expect(result.status).toBe("unavailable");

    if (result.status === "unavailable") {
      expect(result.reason).toContain("padding");
    }

    expect(mocks.toPng).not.toHaveBeenCalled();
  });

  it("returns a PNG data URL and dimensions after capture", async () => {
    const result = await createTopologySnapshot(
      planData,
      { maxWidth: 1200 },
    );

    expect(result.status).toBe("success");

    if (result.status === "success") {
      expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.width).toBeLessThanOrEqual(1200);
    }

    expect(mocks.toPng).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        backgroundColor: "#ffffff",
        cacheBust: true,
      }),
    );

    expect(mocks.toPng).toHaveBeenCalledOnce();
    expect(document.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it("uses a light print-friendly theme during capture", async () => {
    mocks.toPng.mockImplementationOnce(
      async (element: HTMLElement) => {
        expect(element.style.backgroundColor).toBe(
          "rgb(255, 255, 255)",
        );

        expect(element.style.colorScheme).toBe("light");

        return "data:image/png;base64,dGVzdA==";
      },
    );

    const result = await createTopologySnapshot(
      planData,
      { maxWidth: 1200 },
    );

    expect(result.status).toBe("success");
    expect(mocks.toPng).toHaveBeenCalledOnce();
  });

  it("uses an independent fixed viewport for the export", async () => {
    const result = await createTopologySnapshot(
      planData,
      { maxWidth: 1200 },
    );

    expect(result.status).toBe("success");
    expect(mocks.reactFlowProps).toHaveBeenCalledOnce();

    const flowProps = mocks.reactFlowProps.mock.calls[0][0];

    expect(flowProps.defaultViewport).toEqual(
      expect.objectContaining({
        zoom: expect.any(Number),
      }),
    );

    expect(Math.abs(flowProps.defaultViewport.x)).toBe(0);
    expect(Math.abs(flowProps.defaultViewport.y)).toBe(0);
    expect(flowProps.defaultViewport.zoom).toBeGreaterThan(0);
    expect(flowProps.defaultViewport.zoom).toBeLessThanOrEqual(1);
    expect(flowProps.fitView).toBe(false);
    expect(flowProps.viewport).toBeUndefined();
    expect(flowProps.minZoom).toBe(flowProps.defaultViewport.zoom);
    expect(flowProps.maxZoom).toBeGreaterThanOrEqual(flowProps.defaultViewport.zoom);

    // The ordinary two-node plan should retain its original text scale.
    expect(flowProps.defaultViewport.zoom).toBe(1);

    // Export uses the shared topology node renderers.
    expect(flowProps.nodeTypes.gateway).toBeDefined();
    expect(flowProps.nodeTypes.switch).toBeDefined();

    // The adapter supplies role, label, SKU, and BOM product name.
    expect(flowProps.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            role: "gateway",
            label: "Gateway",
            sku: "ER7206",
            name: "Omada Gigabit VPN Router",
          }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({
            role: "switch",
            label: "Switch",
            sku: "SG2210P",
            name: "Omada JetStream PoE Switch",
          }),
        }),
      ]),
    );
  });

  it("passes graph edges to React Flow for rendering", async () => {
    const result = await createTopologySnapshot(
      planData,
      { maxWidth: 1200 },
    );

    expect(result.status).toBe("success");

    const flowProps = mocks.reactFlowProps.mock.calls[0][0];

    expect(flowProps.edges).toHaveLength(1);
    expect(flowProps.edges[0]).toEqual(
      expect.objectContaining({
        id: "edge-1",
        source: "gateway-1",
        target: "switch-1",
        type: "topology",
        data: expect.objectContaining({ linkType: "uplink" }),
      }),
    );
  });

  it("captures the complete 43-node stress topology", async () => {
    const stressPlan =
      topo002StressScenario["TP-Link Omada"]["Cost-Efficient"];

    const result = await createTopologySnapshot(
      stressPlan,
      { maxWidth: 1200 },
    );

    expect(result.status).toBe("success");
    expect(mocks.reactFlowProps).toHaveBeenCalledOnce();

    if (result.status !== "success") {
      return;
    }

    const flowProps = mocks.reactFlowProps.mock.calls[0][0];
    const exportNodes = flowProps.nodes;
    const exportEdges = flowProps.edges;

    const sourceGraph = toFlowGraph({
      bom: stressPlan.bom,
      topology: stressPlan.topology,
    });

    if (sourceGraph.status !== "available") {
      throw new Error(`Stress fixture topology unavailable: ${sourceGraph.reason}`);
    }

    const screenLayout = layoutGraph(sourceGraph);

    expect(screenLayout.nodes).toHaveLength(43);
    expect(screenLayout.edges).toHaveLength(42);
    expect(screenLayout.nodes.map((node) => node.id).sort()).toEqual(
      stressPlan.topology.nodes.map((node) => node.id).sort(),
    );
    expect(screenLayout.edges.map((edge) => edge.id).sort()).toEqual(
      stressPlan.topology.edges.map((edge) => edge.id).sort(),
    );

    // Include floor zones and preserve the screen's graph and edge handles.
    expect(exportNodes).toEqual(toCanvasNodes(screenLayout));
    expect(exportEdges).toEqual(screenLayout.edges);

    // Every edge must still connect existing nodes.
    const nodeIds = new Set(
      exportNodes.map((node: { id: string }) => node.id),
    );

    for (const edge of exportEdges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }

    // Every exported node must have valid coordinates.
    for (const node of exportNodes) {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    }

    // Export must respect the requested maximum width.
    expect(result.width).toBeGreaterThan(0);
    expect(result.width).toBeLessThanOrEqual(1200);
    expect(result.height).toBeGreaterThan(0);

    expect(mocks.toPng).toHaveBeenCalledOnce();
  });

  it("returns unavailable and cleans up when PNG capture fails", async () => {
    mocks.toPng.mockRejectedValueOnce(
      new Error("PNG capture failed"),
    );

    const result = await createTopologySnapshot(
      planData,
      { maxWidth: 1200 },
    );

    expect(result.status).toBe("unavailable");

    if (result.status === "unavailable") {
      expect(result.reason).toBe("PNG capture failed");
    }

    expect(document.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});

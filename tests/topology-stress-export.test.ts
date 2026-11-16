import { describe, expect, it } from "vitest";
import { topo002StressScenario } from "../src/components/comparison/topo002-stress-fixture";
import { toFlowGraph } from "../src/components/topology/adapter";
import { layoutGraph } from "../src/components/topology/layout";
import { getTopologyExportBounds } from "../src/components/topology/topology-export-bounds";

describe("topology stress export", () => {
  it("fits the complete stress topology within the export width", () => {
    const plan =
      topo002StressScenario["TP-Link Omada"]["Cost-Efficient"];

    const flowGraph = toFlowGraph({
      bom: plan.bom,
      topology: plan.topology,
    });

    expect(flowGraph.status).toBe("available");

    if (flowGraph.status !== "available") return;

    const graph = layoutGraph(flowGraph);
    const bounds = getTopologyExportBounds(graph, 40);

    const maxWidth = 1200;
    const scale = Math.min(1, maxWidth / bounds.width);
    const exportWidth = Math.ceil(bounds.width * scale);
    const exportHeight = Math.ceil(bounds.height * scale);

    console.log({
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      boundsWidth: bounds.width,
      boundsHeight: bounds.height,
      scale,
      exportWidth,
      exportHeight,
      effective10pxText: 10 * scale,
      effective11pxText: 11 * scale,
    });

    expect(graph.nodes).toHaveLength(43);
    expect(graph.edges).toHaveLength(42);
    expect(exportWidth).toBeLessThanOrEqual(maxWidth);
    expect(exportHeight).toBeGreaterThan(0);
  });
});

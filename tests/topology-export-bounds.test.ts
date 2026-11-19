import { describe, expect, it } from "vitest";
import { getTopologyExportBounds } from "../src/components/topology/topology-export-bounds";
import type { PositionedFlowGraph } from "../src/components/topology/layout";

function makeGraph(): PositionedFlowGraph {
  return {
    status: "available",
    nodes: [
      {
        id: "node-1",
        type: "default",
        position: { x: 100, y: 200 },
        width: 200,
        height: 100,
        data: { role: "gateway", label: "Gateway" },
      },
      {
        id: "node-2",
        type: "default",
        position: { x: 400, y: 500 },
        width: 180,
        height: 90,
        data: { role: "switch", label: "Switch" },
      },
    ],
    edges: [],
    warnings: [],
  };
}

describe("topology export bounds", () => {
  it("includes all nodes and applies padding", () => {
    expect(getTopologyExportBounds(makeGraph(), 40)).toEqual({
      minX: 60,
      minY: 160,
      maxX: 620,
      maxY: 630,
      width: 560,
      height: 470,
    });
  });

  it("supports zero padding", () => {
    expect(getTopologyExportBounds(makeGraph(), 0)).toEqual({
      minX: 100,
      minY: 200,
      maxX: 580,
      maxY: 590,
      width: 480,
      height: 390,
    });
  });

  it("rejects an empty graph", () => {
    const graph = makeGraph();

    expect(() =>
      getTopologyExportBounds({ ...graph, nodes: [] }),
    ).toThrow("Cannot calculate bounds for an empty topology");
  });

  it("rejects invalid padding", () => {
    expect(() => getTopologyExportBounds(makeGraph(), -1)).toThrow();
  });
});
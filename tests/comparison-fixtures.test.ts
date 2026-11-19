import { describe, expect, it } from "vitest";
import { scenarios } from "../src/components/comparison/fixtures";
import { toFlowGraph } from "@/components/topology/adapter";

describe("happy comparison topology fixtures", () => {
  it("provides valid topology nodes for every BOM device", () => {
    const happyPlans = Object.values(scenarios.happy ?? {}).flatMap((plans) =>
      Object.values(plans ?? {}),
    );

    expect(happyPlans).toHaveLength(4);

    for (const plan of happyPlans) {
      expect(plan?.topology).toBeDefined();
      if (!plan?.topology) throw new Error("Expected happy plan topology");

      const expectedDevices = plan.bom
        .filter((item) => item.category === "Gateway" || item.category === "Access Point")
        .map((item) => [item.sku, item.quantity]);
      const topologyDevices = plan.topology.nodes
        .filter((node) => node.sku)
        .map((node) => [node.sku, node.qty]);

      expect(topologyDevices).toEqual(expectedDevices);

      const graph = toFlowGraph({
        bom: plan.bom,
        topology: plan.topology,
      });
      expect(graph.status).toBe("available");

      const nodeIds = new Set(plan.topology.nodes.map((node) => node.id));
      expect(
        plan.topology.edges.every(
          (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
        ),
      ).toBe(true);
    }
  });
});

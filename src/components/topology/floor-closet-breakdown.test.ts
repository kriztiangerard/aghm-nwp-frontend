import { describe, expect, it } from "vitest";
import { toFlowGraph } from "./adapter";
import { groupTopologyPlacements } from "./floor-closet-breakdown";
import type { TopologyFlowNode } from "./types";

function makeNode(
  id: string,
  label: string,
  placements?: TopologyFlowNode["data"]["placements"],
): TopologyFlowNode {
  return {
    id,
    type: "default",
    data: {
      role: "access_point",
      label,
      ...(placements !== undefined ? { placements } : {}),
    },
  };
}

const floor1 = {
  floorId: "floor-1",
  floorLabel: "Floor 1",
  closetId: "closet-1",
  closetLabel: "Floor 1 Main Network Closet",
  qty: 3,
};

const floor2 = {
  floorId: "floor-2",
  floorLabel: "Floor 2",
  closetId: "closet-2",
  closetLabel: "Floor 2 Main Network Closet",
  qty: 3,
};

describe("TOPO-002 AC4 logical floor/closet grouping", () => {
  it("distributes aggregated AP quantities across floors", () => {
    const nodes = [
      makeNode("ap-1", "Access Points", [floor1, floor2]),
    ];

    const result = groupTopologyPlacements(nodes);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("floor-1");
    expect(result[0].closets[0].items[0].qty).toBe(3);
    expect(result[1].id).toBe("floor-2");
    expect(result[1].closets[0].items[0].qty).toBe(3);

    const total = result.reduce(
      (sum, floor) =>
        sum +
        floor.closets.reduce(
          (closetSum, closet) =>
            closetSum +
            closet.items.reduce(
              (itemSum, item) => itemSum + item.qty,
              0,
            ),
          0,
        ),
      0,
    );

    expect(total).toBe(6);
  });

  it("produces deterministic grouping regardless of node order", () => {
    const nodes = [
      makeNode("ap-b", "AP B", [floor2, floor1]),
      makeNode("ap-a", "AP A", [floor1, floor2]),
    ];

    const first = groupTopologyPlacements(nodes);
    const second = groupTopologyPlacements([...nodes].reverse());

    expect(first).toEqual(second);
    expect(groupTopologyPlacements(nodes)).toEqual(first);
  });

  it("supports legacy topology nodes without placements", () => {
    const nodes = [
      makeNode("ap-legacy", "Legacy AP"),
    ];

    expect(groupTopologyPlacements(nodes)).toEqual([]);
  });

  it("groups nodes by both floor and closet", () => {
    const nodes = [
      makeNode("ap-1", "Access Point", [floor1]),
      makeNode("ap-2", "Secondary AP", [
        {
          ...floor1,
          closetId: "closet-secondary",
          closetLabel: "Secondary Network Closet",
          qty: 2,
        },
      ]),
    ];

    const result = groupTopologyPlacements(nodes);

    expect(result).toHaveLength(1);
    expect(result[0].closets).toHaveLength(2);
    expect(result[0].closets.map((closet) => closet.id)).toEqual([
      "closet-1",
      "closet-secondary",
    ]);
  });

  it("preserves placement metadata through the topology adapter", () => {
    const result = toFlowGraph({
      bom: [
        {
          sku: "AP-TEST",
          name: "Test Access Point",
          category: "Access Point",
        },
      ],
      topology: {
        nodes: [
          {
            id: "ap-1",
            role: "access_point",
            layer: "edge",
            label: "Access Points",
            sku: "AP-TEST",
            qty: 6,
            placements: [floor1, floor2],
          },
        ],
        edges: [],
      },
    });

    expect(result.status).toBe("available");

    if (result.status !== "available") {
      throw new Error("Expected available topology");
    }

    expect(result.nodes[0].data.placements).toEqual([
      floor1,
      floor2,
    ]);

  });
});
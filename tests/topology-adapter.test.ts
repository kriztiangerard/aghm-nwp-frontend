import { describe, expect, it } from "vitest";
import { toFlowGraph } from "../src/components/topology/adapter";

describe("topology adapter BOM name matching", () => {
  it.each(["Access Point", "access_point"])(
    "matches the BOM name when the category is %s",
    (category) => {
      const result = toFlowGraph({
        bom: [
          {
            sku: "AP-TEST",
            name: "Test Access Point",
            category,
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
            },
          ],
          edges: [],
        },
      });

      expect(result.status).toBe("available");

      if (result.status !== "available") {
        throw new Error("Expected available topology");
      }

      expect(result.nodes[0].data.name).toBe("Test Access Point");
      expect(result.warnings).toEqual([]);
    },
  );

  it("does not attach a BOM name when the SKU does not match", () => {
    const result = toFlowGraph({
      bom: [
        {
          sku: "AP-OTHER",
          name: "Other Access Point",
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
          },
        ],
        edges: [],
      },
    });

    expect(result.status).toBe("available");

    if (result.status !== "available") {
      throw new Error("Expected available topology");
    }

    // When no BOM line matches, the adapter displays the SKU
    // instead of leaving the device name undefined.
    expect(result.nodes[0].data.name).toBe("AP-TEST");
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "BOM_LINE_NOT_FOUND",
      }),
    );
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "PRODUCT_NAME_MISSING",
      }),
    );
  });
});

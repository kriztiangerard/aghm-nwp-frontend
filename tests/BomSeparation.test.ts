import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("AC 8: BOM and installation materials separation", () => {
  it("restricts BOM categories to supported hardware categories", () => {
    const contract = readFileSync("src/types/api-types.ts", "utf8");

    const match = contract.match(
      /export type BomCategory\s*=\s*([^;]+);/
    );

    expect(match).not.toBeNull();

    const categories = [...match![1].matchAll(/'([^']+)'/g)]
      .map((match) => match[1]);

    expect(categories).toEqual([
      "gateway",
      "controller",
      "switch",
      "access_point",
      "enclosure",
    ]);

    expect(categories).not.toContain("cabling");
    expect(categories).not.toContain("patch_cord");
    expect(categories).not.toContain("sfp");
  });

  it("keeps installation materials separate in the report mapping", () => {
    const source = readFileSync(
      "src/lib/report/report-view-model.ts",
      "utf8"
    );

    expect(source).toContain(
      "const bomLines = selectedPlan.bom.lines.map"
    );

    expect(source).toContain(
      "installationMaterials: selectedPlan.installationMaterials ?? null"
    );
  });
});

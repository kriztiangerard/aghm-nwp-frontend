import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { adaptEngineResult, type EngineResult } from "@/components/comparison/adapter";
import { ComponentTable } from "@/components/comparison/componenttable";
import type { BomLineItem } from "@/components/comparison/types";
import BomTable from "@/components/report/BomTable";
import InstallationMaterialsSummary from "@/components/report/InstallationMaterialsSummary";
import { bomToCsv } from "@/lib/report/buildBomCsv";
import { humanizeValue } from "@/lib/report/format-assumptions";
import {
  formatFirewallNote,
  formatMaterialDescription,
} from "@/lib/report/format-labels";
import type { ReportViewModel } from "@/lib/report/report-view-model";

afterEach(cleanup);

const NOTE = "Firewall: integrated in gateway Example Gateway (GW-1)";

const gatewayLine: ReportViewModel["bom"]["lines"][number] = {
  category: "gateway",
  sku: "GW-1",
  name: "Example Gateway",
  vendor: "TP-Link Omada",
  qty: 2,
  unitPrice: 5000,
  lineTotal: 10000,
  status: "ACTIVE",
  isGeneric: false,
  priceSource: "manual",
  isStale: false,
  priceUpdatedAt: "2026-11-20",
};

const bom: ReportViewModel["bom"] = {
  currency: "PHP",
  lines: [gatewayLine],
  total: 10000,
  totalIsPartial: false,
};

const comparisonLine: BomLineItem = {
  sku: "GW-1",
  name: "Example Gateway",
  category: "Gateway",
  quantity: 2,
  unitPrice: 5000,
  subtotal: 10000,
  status: "ACTIVE",
  priceSource: "manual",
  isStale: false,
  priceUpdatedAt: "2026-11-20",
  isGeneric: false,
};

describe("NWP-ENGINE-019 AC8: display-only firewall note", () => {
  it("names the gateway, whatever the category casing", () => {
    expect(formatFirewallNote([gatewayLine])).toBe(NOTE);
    expect(formatFirewallNote([comparisonLine])).toBe(NOTE);
  });

  it("does not repeat the SKU when there is no separate product name", () => {
    expect(formatFirewallNote([{ category: "gateway", sku: "GW-1", name: "GW-1" }])).toBe(
      "Firewall: integrated in gateway GW-1",
    );
  });

  it("claims no firewall when the plan has no gateway", () => {
    expect(formatFirewallNote([])).toBeNull();
    expect(formatFirewallNote([{ category: "switch", sku: "SW-1" }])).toBeNull();
  });

  it("shows one note row in the report BOM table, with no price or quantity", () => {
    render(<BomTable bom={bom} />);

    const cell = screen.getByText(NOTE);
    const row = cell.closest("tr") as HTMLTableRowElement;

    expect(within(row).getAllByRole("cell")).toHaveLength(1);
    expect(row.textContent).toBe(NOTE);
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
  });

  it("shows the note in the comparison table", () => {
    render(<ComponentTable bom={[comparisonLine]} currency="PHP" />);

    expect(screen.getByText(NOTE)).toBeTruthy();
  });

  it("keeps the firewall out of the CSV", () => {
    const csv = bomToCsv({
      planComplete: true,
      generatedAtIso: "2026-11-27T00:00:00.000Z",
      bom,
    } as ReportViewModel);

    expect(csv).not.toMatch(/firewall/i);
  });
});

describe("NWP-ENGINE-019 AC7: SFP presentation", () => {
  const sfp = {
    item: "sfp_modules",
    description: "SFP modules for fiber uplinks",
    unit: "module",
    links: 3,
    modules: 6,
    formFactor: "SFP+",
    priceDisplay: "price on request",
  };

  it("states module count, link count and form factor", () => {
    expect(formatMaterialDescription(sfp)).toBe(
      "SFP modules for fiber uplinks. 6 modules for 3 links. Form factor: SFP+.",
    );
  });

  it("does not guess an unknown form factor", () => {
    for (const formFactor of ["form factor not determined", null]) {
      expect(formatMaterialDescription({ ...sfp, formFactor })).toMatch(
        /Form factor not determined\.$/,
      );
    }
  });

  it("leaves other materials unchanged", () => {
    expect(formatMaterialDescription({ item: "cat6", description: "Cable" })).toBe("Cable");
    expect(formatMaterialDescription({ item: "cat6" })).toBe("—");
  });

  it("renders the counts with price on request and no quantity or total column", () => {
    render(<InstallationMaterialsSummary materials={{ currency: "PHP", items: [sfp] }} />);

    expect(screen.getByText(/6 modules for 3 links/)).toBeTruthy();
    expect(screen.getByText("Price on request")).toBeTruthy();

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).not.toContain("Quantity");
    expect(headers).not.toContain("Line total");
    expect(headers).not.toContain("Total");
  });
});

const engineResult = (formFactor: string | null): EngineResult => ({
  contractVersion: 3,
  generatedAt: "2026-11-27T00:00:00.000Z",
  plans: [
    {
      vendor: "TP-Link Omada",
      planType: "CE",
      complete: true,
      items: [{ category: "gateway", sku: "GW-1", qty: 1 }],
      bom: {
        currency: "PHP",
        lines: [{ sku: "GW-1", qty: 1, unitPrice: 5000, lineTotal: 5000 }],
        total: 5000,
        totalIsPartial: false,
      },
      unmet: [],
      flags: [
        {
          code: "SKU_SUNSETTING",
          message:
            "GW-1 is sunsetting; confirm availability with the vendor or distributor before purchase.",
        },
      ],
      optics: { links: 2, modules: 4, formFactor },
    },
  ],
});

describe("NWP-ENGINE-019 AC4 and AC7: comparison adapter", () => {
  const planFor = (formFactor: string | null) =>
    adaptEngineResult(engineResult(formFactor)).plansData["TP-Link Omada"]?.["Cost-Efficient"];

  it("marks a Sunsetting line and carries its notice", () => {
    const plan = planFor("SFP+");

    expect(plan?.bom[0].status).toBe("SUNSETTING");
    expect(plan?.advisories?.some((text) => text.startsWith("GW-1 is sunsetting"))).toBe(true);
  });

  it("names a known form factor", () => {
    expect(planFor("SFP+")?.advisories).toContain(
      "Fiber links need 4 SFP+ transceiver modules. Not included in the total.",
    );
  });

  it("does not present SFP as the form factor when it is unknown", () => {
    expect(planFor(null)?.advisories).toContain(
      "Fiber links need 4 transceiver modules (form factor not determined). Not included in the total.",
    );
  });
});

describe("NWP-ENGINE-019 AC3: fallback assumption", () => {
  it("words the per-plan Wi-Fi standard like the shared one", () => {
    expect(humanizeValue("wireless.planStandard", "6")).toBe("Wi-Fi 6");
  });
});

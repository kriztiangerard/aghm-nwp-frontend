import { describe, expect, it } from "vitest";
import { bomToCsv } from "../src/lib/report/buildBomCsv";
import type { ReportViewModel } from "../src/lib/report/report-view-model";

const GENERATED_AT = "2026-11-13T07:04:05.000Z";

function makeReport(
  overrides: Partial<ReportViewModel> = {},
): ReportViewModel {
  return {
    planComplete: true,
    generatedAtIso: GENERATED_AT,
    bom: {
      currency: "PHP",
      lines: [
        {
          category: "Gateway",
          name: "Omada Gateway",
          sku: "ER605",
          vendor: "TP-Link Omada",
          qty: 1,
          unitPrice: 5000,
          lineTotal: 5000,
          status: "ACTIVE",
          isGeneric: false,
          priceSource: "manual",
          isStale: true,
          priceUpdatedAt: "2026-10-01",
          priceReferences: [
            "https://example.com/one",
            "https://example.com/two",
          ],
        },
      ],
      total: 5000,
      totalIsPartial: false,
    },
    ...overrides,
  } as ReportViewModel;
}

function dataRows(csv: string): string[] {
  const lines = csv.slice(1).split("\r\n");
  const headerIndex = lines.findIndex((line) =>
    line.startsWith("Category,Product Name,SKU,Vendor,")
  );

  if (headerIndex < 0) {
    throw new Error("CSV header missing");
  }

  return lines.slice(headerIndex + 1).filter(Boolean);
}

describe("NWP-REPORT-005 BOM CSV export", () => {
  it("AC1: exports one BOM row per line plus a total row", () => {
    const csv = bomToCsv(makeReport());
    const rows = dataRows(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("Omada Gateway");
    expect(rows[1]).toContain("Estimated total");
  });

  it("AC2: includes the required 14 columns", () => {
    const csv = bomToCsv(makeReport());

    expect(csv).toContain(
      "Category,Product Name,SKU,Vendor,Quantity,Unit Price,Line Total,Currency,Lifecycle Status,Price Source,Stale Price,Last Verified Date,Price Reference Links,Notes"
    );
  });

  it("AC2: preserves pricing metadata and space-separated references", () => {
    const row = dataRows(bomToCsv(makeReport()))[0];

    expect(row).toContain(",PHP,ACTIVE,manual,Yes,2026-10-01,");
    expect(row).toContain(
      "https://example.com/one https://example.com/two"
    );
  });

  it("AC3: leaves missing price cells empty and adds Notes", () => {
    const report = makeReport({
      bom: {
        currency: "PHP",
        lines: [{
          category: "Gateway",
          name: "Unpriced Gateway",
          sku: "X1",
          vendor: "Vendor",
          qty: 1,
          unitPrice: null,
          lineTotal: null,
          status: "ACTIVE",
          isGeneric: false,
        }],
        total: null,
        totalIsPartial: true,
      },
    });

    const row = dataRows(bomToCsv(report))[0];

    expect(row).toContain("Vendor,1,,,PHP");
    expect(row).toContain("Price on request");
  });

  it("AC4: labels partial totals", () => {
    const report = makeReport({
      bom: {
        currency: "PHP",
        lines: [],
        total: 2500,
        totalIsPartial: true,
      },
    });

    expect(dataRows(bomToCsv(report))[0]).toContain(
      "Partial total,,,,,,2500,PHP"
    );
  });

  it("AC5: includes the generation timestamp and disclaimers", () => {
    const csv = bomToCsv(makeReport());

    expect(csv).toContain("Generation Date and Time");
    expect(csv).toContain("Price Disclaimer");
    expect(csv).toContain("Planning Stage Disclaimer");
    expect(csv).toContain("November 13, 2026");
  });

  it("AC6: escapes commas, quotes, and embedded line breaks", () => {
    const report = makeReport();
    report.bom.lines[0].name = 'Gateway, "Enterprise"\nModel';

    const csv = bomToCsv(report);

    expect(csv).toContain(
      '"Gateway, ""Enterprise""\nModel"'
    );
  });

  it("AC7: neutralizes formula-like text values", () => {
    const report = makeReport();
    report.bom.lines[0].sku = "=1+1";
    report.bom.lines[0].name = "@SUM(A1:A2)";
    report.bom.lines[0].vendor = "+cmd";

    const row = dataRows(bomToCsv(report))[0];

    expect(row).toContain("'=1+1");
    expect(row).toContain("'@SUM(A1:A2)");
    expect(row).toContain("'+cmd");
  });

  it("AC7: protects formulas preceded by whitespace or control characters", () => {
    const payloads = [
      " =1+1",
      "\t=1+1",
      "\r=1+1",
      "\n=1+1",
      "  +SUM(A1:A2)",
      "\t-CMD",
      "\n@SUM(A1:A2)",
    ];

    for (const payload of payloads) {
      const report = makeReport();
      report.bom.lines[0].sku = payload;

      const csv = bomToCsv(report);

      expect(csv).toContain("'" + payload);
    }
  });
  it("AC8: starts with UTF-8 BOM and uses CRLF", () => {
    const csv = bomToCsv(makeReport());

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("\r\n");
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("AC9: excludes requirements, topology and installation materials", () => {
    const report = makeReport({
      requirements: [{
        label: "SECRET_REQUIREMENT_MARKER",
        value: "not for CSV",
      }] as ReportViewModel["requirements"],
      topology: { marker: "SECRET_TOPOLOGY_MARKER" },
      installationMaterials: {
        marker: "SECRET_INSTALLATION_MARKER",
      },
    });

    const csv = bomToCsv(report);

    expect(csv).not.toContain("SECRET_REQUIREMENT_MARKER");
    expect(csv).not.toContain("SECRET_TOPOLOGY_MARKER");
    expect(csv).not.toContain("SECRET_INSTALLATION_MARKER");
  });

  it("rejects incomplete plans", () => {
    expect(() =>
      bomToCsv(makeReport({ planComplete: false }))
    ).toThrow(/incomplete plan/i);
  });

  it("produces deterministic output for identical inputs", () => {
    const report = makeReport();

    expect(bomToCsv(report)).toBe(bomToCsv(report));
  });
});

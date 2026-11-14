import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReportViewModel } from "../src/lib/report/report-view-model";
import { buildBomCsv } from "../src/lib/buildBomCsv";
import {
  DISCLAIMER_TITLE,
  PLANNING_STAGE_DISCLAIMER,
  PRICING_DISCLAIMER,
  getDisclaimerBlock,
} from "../src/lib/disclaimers";

const GENERATED_AT = "2026-11-13T07:04:05.000Z";

type Bom = ReportViewModel["bom"];

// Cast through unknown so the fixture only has to carry the fields the CSV builder reads.
const makeBom = (overrides: Record<string, unknown> = {}): Bom =>
  ({
    currency: "PHP",
    lines: [
      { category: "gateway", sku: "ER605", name: "Omada Gateway", vendor: "TP-Link Omada", qty: 1, unitPrice: 5000, lineTotal: 5000, status: "ACTIVE" },
      { category: "switch", sku: "SG2210P", name: "Omada Switch", vendor: "TP-Link Omada", qty: 2, unitPrice: 8000, lineTotal: 16000, status: "ACTIVE" },
    ],
    total: 21000,
    totalIsPartial: false,
    ...overrides,
  }) as unknown as Bom;

afterEach(() => {
  vi.useRealTimers();
});

describe("buildBomCsv disclaimers (AC1, AC2, AC4)", () => {
  const csv = buildBomCsv(makeBom(), GENERATED_AT);
  const block = getDisclaimerBlock(GENERATED_AT);

  it("starts with a UTF-8 BOM and uses CRLF line endings", () => {
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("puts the shared title on the first row", () => {
    expect(csv.slice(1).split("\r\n")[0]).toBe(DISCLAIMER_TITLE);
  });

  it("includes the generated-at line and both shared paragraphs", () => {
    expect(csv).toContain(block.generatedAtLine);
    expect(csv).toContain(PRICING_DISCLAIMER);
    expect(csv).toContain(PLANNING_STAGE_DISCLAIMER);
  });

  it("places every disclaimer before the BOM header row", () => {
    const header = csv.indexOf("Category,SKU,Device,Vendor");
    expect(header).toBeGreaterThan(-1);
    expect(csv.indexOf(block.generatedAtLine)).toBeLessThan(header);
    expect(csv.indexOf(PRICING_DISCLAIMER)).toBeLessThan(header);
    expect(csv.indexOf(PLANNING_STAGE_DISCLAIMER)).toBeLessThan(header);
  });
});

describe("buildBomCsv stability (AC5)", () => {
  it("does not depend on the current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const first = buildBomCsv(makeBom(), GENERATED_AT);
    vi.setSystemTime(new Date("2027-06-30T12:00:00Z"));
    const second = buildBomCsv(makeBom(), GENERATED_AT);
    expect(second).toBe(first);
  });

  it("stamps the generatedAt it was given", () => {
    const a = buildBomCsv(makeBom(), "2026-11-13T07:04:05.000Z");
    const b = buildBomCsv(makeBom(), "2026-11-14T09:30:00.000Z");
    expect(a).not.toBe(b);
    expect(a).toContain(getDisclaimerBlock("2026-11-13T07:04:05.000Z").generatedAtLine);
    expect(b).toContain(getDisclaimerBlock("2026-11-14T09:30:00.000Z").generatedAtLine);
  });

  it("throws on an invalid timestamp rather than exporting a wrong stamp", () => {
    expect(() => buildBomCsv(makeBom(), "nope")).toThrow(/Invalid generatedAt/);
  });
});

describe("buildBomCsv BOM rows", () => {
  it("writes one row per line plus a total row", () => {
    const csv = buildBomCsv(makeBom(), GENERATED_AT);
    expect(csv).toContain("gateway,ER605,Omada Gateway,TP-Link Omada,1,5000,5000,ACTIVE");
    expect(csv).toContain("switch,SG2210P,Omada Switch,TP-Link Omada,2,8000,16000,ACTIVE");
    expect(csv).toContain(",,,,,Total,21000,");
  });

  it("shows 'Price on request' for unpriced lines and marks the total partial", () => {
    const bom = makeBom({
      lines: [{ category: "gateway", sku: "X1", name: "Gateway X", vendor: "V", qty: 1, unitPrice: null, lineTotal: null, status: "ACTIVE" }],
      total: null,
      totalIsPartial: true,
    });
    const csv = buildBomCsv(bom, GENERATED_AT);
    expect(csv).toContain("gateway,X1,Gateway X,V,1,Price on request,Price on request,ACTIVE");
    expect(csv).toContain("Total (partial),Price on request");
  });

  it("quotes cells containing commas and doubles embedded quotes", () => {
    const bom = makeBom({
      lines: [{ category: "switch", sku: "S1", name: 'Switch, 24-port "PoE"', vendor: "V", qty: 1, unitPrice: 1, lineTotal: 1, status: "ACTIVE" }],
    });
    expect(buildBomCsv(bom, GENERATED_AT)).toContain('"Switch, 24-port ""PoE"""');
  });

  it("neutralises spreadsheet formula injection in text cells", () => {
    const bom = makeBom({
      lines: [{ category: "switch", sku: "=1+1", name: "@cmd", vendor: "V", qty: 1, unitPrice: 1, lineTotal: 1, status: "ACTIVE" }],
    });
    const csv = buildBomCsv(bom, GENERATED_AT);
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'@cmd");
  });
});
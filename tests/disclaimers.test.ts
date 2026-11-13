import { describe, expect, it } from "vitest";
import {
  DISCLAIMER_TITLE,
  PLANNING_STAGE_DISCLAIMER,
  PRICING_DISCLAIMER,
  formatGeneratedAt,
  getDisclaimerBlock,
} from "../src/lib/disclaimers";

// 07:04:05 UTC on 13 Nov 2026 is 15:04:05 in Asia/Manila (UTC+8).
const GENERATED_AT = "2026-11-13T07:04:05.000Z";

describe("disclaimer wording (AC1, AC2)", () => {
  it("pricing disclaimer says prices reflect the catalog at generation time and to confirm with the distributor", () => {
    expect(PRICING_DISCLAIMER).toMatch(/product catalog at the time/i);
    expect(PRICING_DISCLAIMER).toMatch(/generated/i);
    expect(PRICING_DISCLAIMER).toMatch(/confirm current pricing and availability with the distributor/i);
    expect(PRICING_DISCLAIMER).toMatch(/before making a purchase/i);
  });

  it("planning-stage disclaimer covers planning only, site survey, installation and responsibility", () => {
    expect(PLANNING_STAGE_DISCLAIMER).toMatch(/planning stage only/i);
    expect(PLANNING_STAGE_DISCLAIMER).toMatch(/physical site survey/i);
    expect(PLANNING_STAGE_DISCLAIMER).toMatch(/professional installation/i);
    expect(PLANNING_STAGE_DISCLAIMER).toMatch(/final hardware selection, procurement, and installation/i);
    expect(PLANNING_STAGE_DISCLAIMER).toMatch(/qualified network professionals/i);
  });
});

describe("formatGeneratedAt (AC1, AC5)", () => {
  it("renders the date and time in Asia/Manila with an explicit zone", () => {
    const text = formatGeneratedAt(GENERATED_AT);
    expect(text).toContain("2026");
    expect(text).toContain("November");
    expect(text).toContain("3:04:05");
    expect(text).toContain("GMT+8");
  });

  it("rolls the date over using Manila time, not UTC", () => {
    // 17:00 UTC on the 13th is 01:00 on the 14th in Manila.
    const text = formatGeneratedAt("2026-11-13T17:00:00.000Z");
    expect(text).toContain("14");
    expect(text).toContain("1:00:00");
  });

  it("throws on an invalid timestamp instead of printing a wrong one", () => {
    expect(() => formatGeneratedAt("not-a-date")).toThrow(/Invalid generatedAt/);
    expect(() => formatGeneratedAt("")).toThrow(/Invalid generatedAt/);
  });

  it("is deterministic for the same input", () => {
    expect(formatGeneratedAt(GENERATED_AT)).toBe(formatGeneratedAt(GENERATED_AT));
  });
});

describe("getDisclaimerBlock (AC4)", () => {
  it("returns the shared title and both paragraphs in display order", () => {
    const block = getDisclaimerBlock(GENERATED_AT);
    expect(block.title).toBe(DISCLAIMER_TITLE);
    expect(block.paragraphs).toEqual([PRICING_DISCLAIMER, PLANNING_STAGE_DISCLAIMER]);
  });

  it("builds the generated-at line from the formatter", () => {
    const block = getDisclaimerBlock(GENERATED_AT);
    expect(block.generatedAtLine).toBe(`Plan generated: ${formatGeneratedAt(GENERATED_AT)}`);
  });

  it("returns identical output for identical input", () => {
    expect(getDisclaimerBlock(GENERATED_AT)).toEqual(getDisclaimerBlock(GENERATED_AT));
  });

  it("propagates the invalid-timestamp error", () => {
    expect(() => getDisclaimerBlock("garbage")).toThrow(/Invalid generatedAt/);
  });
});
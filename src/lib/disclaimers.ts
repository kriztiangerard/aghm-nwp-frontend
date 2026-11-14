// NWP-REPORT-006: single source of truth for every disclaimer shown or exported.
// The Final Report page, the PDF and the CSV all read from this module, so the wording cannot diverge.
// NOTE: wording is adapted from the manuscript (Delimitations, Report generation FRs, Final Report mockup).
// It still needs team confirmation (subtask 1).

export const DISCLAIMER_TITLE = "Planning estimate only";

/** Pricing disclaimer (AC1). The generated-at line is built separately so it is always the exact timestamp. */
export const PRICING_DISCLAIMER =
  "Prices reflect the product catalog at the time this plan was generated. " +
  "Confirm current pricing and availability with the distributor before making a purchase.";

/** Planning-stage disclaimer (AC2). */
export const PLANNING_STAGE_DISCLAIMER =
  "This output is for the planning stage only. It is not a quote or a deployment-ready design, " +
  "and it is not a substitute for a physical site survey or professional installation. " +
  "Final hardware selection, procurement, and installation remain the responsibility of " +
  "qualified network professionals and the deploying organization.";

const GENERATED_AT_LABEL = "Plan generated";

// A fixed locale and time zone keep the page, PDF and CSV showing the identical string
// regardless of the viewer's browser settings.
const generatedAtFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "long",
  timeStyle: "long",
  timeZone: "Asia/Manila",
});

/**
 * Formats the engine's `generatedAt` ISO string (EngineResult.generatedAt, added by the handler).
 * Throws on an invalid value instead of printing a wrong or empty timestamp on a disclaimer.
 */
export function formatGeneratedAt(generatedAt: string): string {
  const date = new Date(generatedAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid generatedAt timestamp: "${generatedAt}"`);
  }
  return generatedAtFormatter.format(date);
}

export interface DisclaimerBlock {
  title: string;
  generatedAtLine: string;
  paragraphs: readonly string[];
}

/**
 * Everything a renderer needs, in display order. Page, PDF and CSV all call this.
 * Pass EngineResult.generatedAt, never `new Date()`, so the stamp matches what the user saw (AC5).
 */
export function getDisclaimerBlock(generatedAt: string): DisclaimerBlock {
  return {
    title: DISCLAIMER_TITLE,
    generatedAtLine: `${GENERATED_AT_LABEL}: ${formatGeneratedAt(generatedAt)}`,
    paragraphs: [PRICING_DISCLAIMER, PLANNING_STAGE_DISCLAIMER],
  };
}
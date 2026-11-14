import type { ReportViewModel } from "@/lib/report/report-view-model";

/**
 * PDF report builder: entry point only. Implemented by NWP-REPORT-004.
 *
 * NWP-REPORT-006 requirements the implementation must follow:
 *  - Build from the ReportViewModel only. Do not re-fetch data and do not call `new Date()`;
 *    use `report.generatedAtIso` / `report.disclaimers` so the stamp matches what the user saw (AC5).
 *  - Render `report.disclaimers` (title, generatedAtLine, paragraphs) prominently on the first page,
 *    not as small print (AC1, AC2). Never write the disclaimer text again in this file (AC4).
 *    DisclaimerPdfSection.tsx does this for @react-pdf/renderer; if REPORT-004 picks another
 *    library, render the same `report.disclaimers` fields with that library's primitives.
 *  - The PDF contains: requirements, recommended hardware, topology diagram, and the BOM.
 *
 * TODO(REPORT-004): build the document here and return it as a Blob.
 */
export async function buildReportPdf(report: ReportViewModel): Promise<Blob> {
  void report;
  throw new Error("PDF generation is not implemented yet (NWP-REPORT-004).");
}
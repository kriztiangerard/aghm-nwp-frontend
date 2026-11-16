import { pdf, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { ReportViewModel } from "./report-view-model";
import { ReportPdfDocument } from "./ReportPdfDocument";

/**
 * NWP-REPORT-004: Generate the report PDF entirely in the browser.
 *
 * Uses the existing ReportViewModel without refetching data.
 * REPORT-007 may supply an optional topology snapshot.
 */
export async function buildReportPdf(
  report: ReportViewModel,
  topologySnapshot?: string | null,
): Promise<Blob> {
  if (!report.planComplete) {
    throw new Error("Cannot export an incomplete network plan.");
  }

  const document = (
    <ReportPdfDocument
      report={report}
      topologySnapshot={topologySnapshot}
    />
  );

  return pdf(document as ReactElement<DocumentProps>).toBlob();
}

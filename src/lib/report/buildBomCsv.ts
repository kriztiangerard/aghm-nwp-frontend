import { downloadBlob } from "@/lib/downloadBlob";
import type { ReportViewModel } from "./report-view-model";
import { getDisclaimerBlock } from "@/lib/disclaimers";

type Cell = string | number | null | undefined;

function csvCell(value: Cell): string {
  if (value === null || value === undefined) return "";

  let text = String(value);

  // Prevent spreadsheet formula execution, including whitespace-prefixed payloads.
  if (typeof value === "string" && /^[\s\uFEFF]*[=+\-@]/u.test(text)) {
    text = "'" + text;
  }

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function csvRow(values: Cell[]): string {
  return values.map(csvCell).join(",");
}

const HEADERS = [
  "Category",
  "Product Name",
  "SKU",
  "Vendor",
  "Quantity",
  "Unit Price",
  "Line Total",
  "Currency",
  "Lifecycle Status",
  "Price Source",
  "Stale Price",
  "Last Verified Date",
  "Price Reference Links",
  "Notes",
];

export function bomToCsv(viewModel: ReportViewModel): string {
  const { bom, generatedAtIso } = viewModel;

  if (!viewModel.planComplete) {
    throw new Error("Cannot export CSV for an incomplete plan.");
  }

  const disclaimer = getDisclaimerBlock(generatedAtIso);

  const rows: string[] = [
    csvRow(["Disclaimer", disclaimer.title]),
    csvRow(["Generation Date and Time", disclaimer.generatedAtLine]),
    csvRow(["Price Disclaimer", disclaimer.paragraphs[0]]),
    csvRow(["Planning Stage Disclaimer", disclaimer.paragraphs[1]]),
    "",
    csvRow(HEADERS),
  ];

  for (const line of bom.lines) {
    const hasMissingPrice =
      line.unitPrice === null || line.lineTotal === null;

    rows.push(
      csvRow([
        line.category,
        line.name,
        line.sku,
        line.vendor,
        line.qty,
        line.unitPrice,
        line.lineTotal,
        bom.currency,
        line.status,
        line.priceSource ?? "",
        line.isStale === true ? "Yes" : "No",
        line.priceUpdatedAt ?? "",
        (line.priceReferences ?? [])
          .filter((url) => /^https?:\/\//i.test(url))
          .join(" "),
        hasMissingPrice ? "Price on request" : "",
      ]),
    );
  }

  rows.push(
    csvRow([
      bom.totalIsPartial ? "Partial total" : "Estimated total",
      "",
      "",
      "",
      "",
      "",
      bom.total,
      bom.currency,
      "",
      "",
      "",
      "",
      "",
      "",
    ]),
  );

  return "\uFEFF" + rows.join("\r\n") + "\r\n";
}

/**
 * Backward-compatible entry point for existing report components.
 * The canonical R005 API is bomToCsv(viewModel).
 */
export function buildBomCsv(
  bom: ReportViewModel["bom"],
  generatedAt: string,
): string {
  const viewModel = {
    bom,
    generatedAtIso: generatedAt,
    planComplete: true,
  } as ReportViewModel;

  return bomToCsv(viewModel);
}

export function downloadCsv(csv: string, fileName: string): void {
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  downloadBlob(blob, fileName);
}

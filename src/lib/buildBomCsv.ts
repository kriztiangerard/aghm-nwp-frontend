import type { Bom } from "@/src/types/api-types";
import { getDisclaimerBlock } from "@/lib/disclaimers";

type Cell = string | number | null;

// Quotes per RFC 4180, and neutralises spreadsheet formula injection on text cells.
function toCell(value: Cell): string {
  if (value === null) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const row = (cells: Cell[]) => cells.map(toCell).join(",");

/**
 * Builds the BOM CSV (AC1, AC4, AC5).
 * - Disclaimers come from the shared module and sit at the top, so they are the first thing seen on open.
 * - `bom` and `generatedAt` must come from the in-memory EngineResult the user saw, never re-fetched
 *   and never `new Date()`, so a later pricing sync cannot change an already-generated export.
 */
export function buildBomCsv(bom: Bom, generatedAt: string): string {
  const { title, generatedAtLine, paragraphs } = getDisclaimerBlock(generatedAt);

  const rows: string[] = [
    row([title]),
    row([generatedAtLine]),
    ...paragraphs.map((p) => row([p])),
    "",
    row(["Category", "SKU", "Device", "Vendor", "Qty", `Unit price (${bom.currency})`, `Line total (${bom.currency})`, "Status"]),
    ...bom.lines.map((l) =>
      row([
        l.category,
        l.sku,
        l.name,
        l.vendor,
        l.qty,
        l.unitPrice ?? "Price on request",
        l.lineTotal ?? "Price on request",
        l.status,
      ]),
    ),
    row(["", "", "", "", "", bom.totalIsPartial ? "Total (partial)" : "Total", bom.total ?? "Price on request", ""]),
  ];

  // CRLF per RFC 4180; the BOM prefix makes Excel read UTF-8 correctly.
  return "\uFEFF" + rows.join("\r\n") + "\r\n";
}

/** Triggers the browser download of the CSV text. */
export function downloadCsv(csv: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
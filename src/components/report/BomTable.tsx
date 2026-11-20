import type { ReportViewModel } from "@/lib/report/report-view-model";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Bom = ReportViewModel["bom"];

interface BomTableProps {
  bom: Bom;
}

function formatMoney(value: number | null, currency: string): string {
  if (value === null || !Number.isFinite(value)) {
    return "Price on request";
  }

  return `${currency} ${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCategory(category: string): string {
  const categoryLabels: Record<string, string> = {
    firewall: "Firewall",
    gateway: "Gateway",
    switch: "Switch",
    router: "Router",
    access_point: "Access Point",
    ap: "Access Point",
    enclosure: "Enclosure",
  };

  const normalized = category.trim().toLowerCase();

  if (categoryLabels[normalized]) {
    return categoryLabels[normalized];
  }

  return normalized
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isValidReferenceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function BomTable({ bom }: BomTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table className="w-full min-w-[850px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[12%]">Category</TableHead>
            <TableHead className="w-[25%]">Product name</TableHead>
            <TableHead className="w-[10%]">SKU</TableHead>
            <TableHead className="w-[16%]">Vendor</TableHead>
            <TableHead className="w-[8%] text-center">Quantity</TableHead>
            <TableHead className="w-[16%] text-right">
              Estimated unit price
            </TableHead>
            <TableHead className="w-[13%] text-right">Line total</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {bom.lines.map((line, index) => (
            <TableRow key={`${line.sku}-${index}`}>
              <TableCell className="whitespace-nowrap">{formatCategory(line.category)}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div>
                    {line.isGeneric ? "Generic enclosure" : line.name}
                  </div>
                  {line.priceReferences &&
                    line.priceReferences.filter(isValidReferenceUrl).length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {line.priceReferences
                          .filter(isValidReferenceUrl)
                          .map((url, index) => (
                            <a
                              key={`${url}-${index}`}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary underline underline-offset-2"
                            >
                              Reference {index + 1}
                            </a>
                          ))}
                      </div>
                    )}
                  {line.isGeneric && (
                    <Badge variant="outline">Generic</Badge>
                  )}
                  {line.status === "SUNSETTING" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300"
                      >
                        <AlertTriangle className="size-3" aria-hidden="true" />
                        Sunsetting
                      </Badge>
                    </div>
                  )}
                  {line.priceSource === "synchronized" && (
                    <Badge variant="secondary">
                      Synced
                    </Badge>
                  )}
                  {line.priceSource === "manual" && (
                    <Badge variant="secondary">
                      Manual
                    </Badge>
                  )}
                  {line.isStale && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                      >
                        Stale
                      </Badge>
                      {line.priceUpdatedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          Last verified: {(() => {
                            const match = line.priceUpdatedAt?.match(
                              /^(\d{4})-(\d{2})-(\d{2})/,
                            );
                            if (!match) return line.priceUpdatedAt;

                            const months = [
                              "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                            ];
                            const month = Number(match[2]);
                            const day = Number(match[3]);

                            if (month < 1 || month > 12 || day < 1 || day > 31) {
                              return line.priceUpdatedAt;
                            }

                            return `${day} ${months[month - 1]} ${match[1]}`;
                          })()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="break-all whitespace-normal">{line.sku}</TableCell>
              <TableCell className="whitespace-nowrap">
                {line.isGeneric ? "Not specified" : line.vendor}
              </TableCell>
              <TableCell className="whitespace-nowrap text-center">{line.qty}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                {formatMoney(line.unitPrice, bom.currency)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right">
                {line.unitPrice === null || !Number.isFinite(line.unitPrice)
                  ? "Price on request"
                  : formatMoney(line.lineTotal, bom.currency)}
              </TableCell>
            </TableRow>
          ))}

          {bom.lines.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-muted-foreground"
              >
                No BOM line items were provided.
              </TableCell>
            </TableRow>
          )}
        </TableBody>

        <TableFooter>
          <TableRow>
            <TableCell colSpan={6} className="font-semibold">
              {bom.totalIsPartial ||
              bom.lines.some((line) => line.unitPrice === null)
                ? "Equipment subtotal (known prices)"
                : "Estimated total"}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right font-semibold">
              {formatMoney(bom.total, bom.currency)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      {(bom.totalIsPartial ||
        bom.lines.some((line) => line.unitPrice === null)) && (
        <div className="border-t bg-muted/40 px-4 py-3">
          <p className="text-sm font-semibold">Partial total</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This estimate may be incomplete due to unavailable equipment prices or unmet network requirements. Final equipment cost may be higher.
          </p>
        </div>
      )}
    </div>
  );
}

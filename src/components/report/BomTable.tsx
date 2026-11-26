import type { ReportViewModel } from "@/lib/report/report-view-model";
import { Badge } from "@/components/ui/badge";
import { formatCategory } from "@/lib/report/format-labels";
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

const WARN = "text-amber-700 dark:text-amber-400";

function formatVerifiedDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return value;

  return `${day} ${months[month - 1]} ${match[1]}`;
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
    <div className="overflow-x-auto rounded-lg border bg-card">
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
                  {/* Same badge styles and order as the comparison page. */}
                  <div className="flex flex-wrap gap-1">
                    {line.isGeneric && (
                      <Badge variant="outline" className="text-[10px]">
                        Generic
                      </Badge>
                    )}
                    {line.status === "SUNSETTING" && (
                      <Badge variant="outline" className={`text-[10px] ${WARN}`}>
                        <AlertTriangle aria-hidden="true" />
                        <span>Sunsetting</span>
                      </Badge>
                    )}
                    {line.priceSource === "synchronized" && (
                      <Badge variant="secondary" className="text-[10px]">
                        Synced
                      </Badge>
                    )}
                    {line.priceSource === "manual" && (
                      <Badge variant="secondary" className="text-[10px]">
                        Manual
                      </Badge>
                    )}
                    {line.isStale && (
                      <Badge variant="outline" className={`text-[10px] ${WARN}`}>
                        Stale
                      </Badge>
                    )}
                  </div>
                  {line.isStale && line.priceUpdatedAt && (
                    <div className="text-[10px] text-muted-foreground">
                      Last verified: {formatVerifiedDate(line.priceUpdatedAt)}
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

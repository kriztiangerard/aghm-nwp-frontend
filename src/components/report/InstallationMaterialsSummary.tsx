import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InstallationMaterialsSummaryProps {
  materials: Record<string, unknown> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function displayValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return "—";
}

// Matches the BOM's price format when the summary names its currency.
function formatPrice(item: Record<string, unknown>, currency: unknown): string {
  const price = item.priceDisplay ?? item.representativeUnitPrice;

  if (typeof price === "number" && typeof currency === "string") {
    return `${currency} ${price.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return displayValue(price ?? "Price on request");
}

// No disclaimers here: the "Planning estimate only" warning at the top of the
// report (lib/disclaimers.ts) carries the site-survey note for material quantities.
export default function InstallationMaterialsSummary({
  materials,
}: InstallationMaterialsSummaryProps) {
  const items =
    materials && Array.isArray(materials.items)
      ? materials.items.filter(isRecord)
      : [];

  // Same frame, column sizing and empty row as the Network Equipment BOM table.
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table className="w-full min-w-[850px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[18%]">Material</TableHead>
            <TableHead className="w-[40%]">Description</TableHead>
            <TableHead className="w-[10%]">Unit</TableHead>
            <TableHead className="w-[19%] text-right">
              Representative unit price
            </TableHead>
            <TableHead className="w-[13%] text-right">Reference</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.map((item, index) => (
            <TableRow key={`${String(item.item ?? "material")}-${index}`}>
              <TableCell className="break-words whitespace-normal">
                {displayValue(item.item)}
              </TableCell>
              <TableCell className="whitespace-normal">
                {displayValue(item.description)}
              </TableCell>
              <TableCell>{displayValue(item.unit)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                {formatPrice(item, materials?.currency)}
              </TableCell>
              <TableCell className="whitespace-normal text-right">
                {isSafeUrl(item.sourceUrl) ? (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    View source
                  </a>
                ) : typeof item.priceReference === "string" ? (
                  item.priceReference
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}

          {items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center whitespace-normal text-muted-foreground"
              >
                {materials
                  ? "No individual installation material items were provided."
                  : "No installation materials summary was provided for this plan."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

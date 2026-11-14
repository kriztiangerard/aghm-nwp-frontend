import { PLANNING_STAGE_DISCLAIMER } from "@/lib/disclaimers";
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

export default function InstallationMaterialsSummary({
  materials,
}: InstallationMaterialsSummaryProps) {
  const items =
    materials && Array.isArray(materials.items)
      ? materials.items.filter(isRecord)
      : [];

  const note =
    materials &&
    typeof materials.note === "string" &&
    materials.note.trim()
      ? materials.note
      : null;

  return (
    <div className="space-y-4">
      {!materials && (
        <p className="text-sm text-muted-foreground">
          No installation materials summary was provided for this plan.
        </p>
      )}

      {materials && (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {typeof materials.asOfDate === "string" && (
              <span>Pricing date: {materials.asOfDate}</span>
            )}
            {typeof materials.pricingBasis === "string" && (
              <span>Basis: {materials.pricingBasis}</span>
            )}
          </div>

          {items.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Representative unit price</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={`${String(item.item ?? "material")}-${index}`}>
                      <TableCell className="font-medium">
                        {displayValue(item.item)}
                      </TableCell>
                      <TableCell>{displayValue(item.description)}</TableCell>
                      <TableCell>{displayValue(item.unit)}</TableCell>
                      <TableCell>
                        {displayValue(
                          item.priceDisplay ??
                            item.representativeUnitPrice ??
                            "Price on request",
                        )}
                      </TableCell>
                      <TableCell>
                        {isSafeUrl(item.sourceUrl) ? (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-4"
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
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No individual installation material items were provided.
            </p>
          )}
        </>
      )}

      {note && (
        <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          {note}
        </p>
      )}

      <p className="rounded-lg border p-3 text-sm text-muted-foreground">
        {PLANNING_STAGE_DISCLAIMER}
      </p>
    </div>
  );
}

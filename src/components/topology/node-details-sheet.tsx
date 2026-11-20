import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { NodeDetails } from "./node-details";

/**
 * NWP-TOPO-004 AC4/AC5: details panel for the selected node.
 *
 * A shadcn Sheet (modal), so focus moves into the panel when it opens and
 * returns to the node that opened it when it closes (Esc, the close button,
 * or a click outside).
 */
export function NodeDetailsSheet({
  details,
  onClose,
}: {
  details: NodeDetails | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={details !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" data-testid="topology-node-details">
        {details && (
          <>
            <SheetHeader className="border-b">
              <SheetDescription>{details.subtitle}</SheetDescription>
              <SheetTitle className="break-words text-base">
                {details.title}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-4 overflow-y-auto px-4 pb-4">
              {details.rows.length > 0 && (
                <dl className="divide-y rounded-lg border">
                  {details.rows.map((row) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-3 py-2"
                    >
                      <dt className="text-xs text-muted-foreground">
                        {row.label}
                      </dt>
                      <dd className="break-words text-xs font-medium">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {details.notes.length > 0 && (
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {details.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

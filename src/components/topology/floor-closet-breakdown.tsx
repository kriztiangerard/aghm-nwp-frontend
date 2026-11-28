import { useMemo, useState } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupTopologyPlacements, type GroupedItem } from "./floor-closet-grouping.ts";
import type { TopologyFlowNode } from "./types";

interface FloorClosetBreakdownProps {
  nodes: TopologyFlowNode[];
  /** Start expanded. Defaults to collapsed, so the canvas stays in view. */
  defaultOpen?: boolean;
}

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

function DeviceTable({ title, items }: { title: string; items: GroupedItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <table className="mt-2 w-full table-fixed border-collapse text-xs">
      <caption className="pb-1 text-left font-semibold text-foreground">
        {title}
      </caption>
      <colgroup>
        <col />
        <col className="w-12" />
      </colgroup>
      <thead>
        <tr className="text-muted-foreground">
          <th scope="col" className="pb-1 text-left font-medium">
            Device
          </th>
          <th scope="col" className="pb-1 text-right font-medium">
            Qty
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.nodeId} className="border-t">
            <td className="break-words py-1.5 pr-3 align-top text-foreground">
              {item.label}
            </td>
            <td className="whitespace-nowrap py-1.5 text-right align-top font-medium tabular-nums text-foreground">
              {item.qty}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Per-floor, per-closet equipment list under the topology canvas.
 *
 * TOPO-003 follow-up:
 * - Each list is a two-column table (Device | Qty). The quantity header
 *   appears once per table instead of "Qty:" on every row, and the number
 *   column never wraps, so long model names wrap on the left only.
 * - Equipment in the closet is listed apart from the access points and user
 *   devices that the floor's network serves (NWP-ENGINE-019 AC6).
 * - The whole section is collapsible (Base UI Collapsible). Collapsed, the
 *   header still says how many floors and closets it holds.
 */
export function FloorClosetBreakdown({
  nodes,
  defaultOpen = false,
}: FloorClosetBreakdownProps) {
  const [open, setOpen] = useState(defaultOpen);

  const floors = useMemo(
    () => groupTopologyPlacements(nodes),
    [nodes],
  );

  if (floors.length === 0) {
    return null;
  }

  const closetCount = floors.reduce(
    (sum, floor) => sum + floor.closets.length,
    0,
  );

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      render={
        <section
          className="mt-4 rounded-lg border bg-card"
          aria-label="Logical floor and closet grouping"
          data-testid="topology-floor-closet-breakdown"
        />
      }
    >
      <Collapsible.Trigger
        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="topology-floor-closet-toggle"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">
            Groups
          </span>
          <span className="block text-xs text-muted-foreground">
            {plural(floors.length, "floor")} · {plural(closetCount, "closet")}{" "}
            · Deterministic planning approximation, not verified physical
            equipment placement.
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </Collapsible.Trigger>

      <Collapsible.Panel className="border-t px-4 pb-4 pt-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {floors.map((floor) => (
            <div
              key={floor.id}
              className="rounded-lg border bg-background p-3"
              data-testid={`topology-floor-${floor.id}`}
            >
              <h5 className="text-sm font-semibold text-foreground">
                {floor.label}
              </h5>

              {floor.closets.map((closet) => (
                <div key={closet.id}>
                  <DeviceTable
                    title={closet.label}
                    items={closet.items.filter((item) => item.inCloset)}
                  />
                  <DeviceTable
                    title={`Served by ${floor.label}`}
                    items={closet.items.filter((item) => !item.inCloset)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
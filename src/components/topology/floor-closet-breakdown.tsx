import { useMemo, useState } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TopologyFlowNode } from "./types";

interface FloorClosetBreakdownProps {
  nodes: TopologyFlowNode[];
  /** Start expanded. Defaults to collapsed, so the canvas stays in view. */
  defaultOpen?: boolean;
}

interface GroupedItem {
  nodeId: string;
  label: string;
  qty: number;
}

interface ClosetGroup {
  id: string;
  label: string;
  items: GroupedItem[];
}

interface FloorGroup {
  id: string;
  label: string;
  closets: ClosetGroup[];
}

export function groupTopologyPlacements(
  nodes: TopologyFlowNode[],
): FloorGroup[] {
  const floors = new Map<string, FloorGroup>();

  for (const node of nodes) {
    const placements = node.data.placements ?? [];

    for (const placement of placements) {
      if (!Number.isFinite(placement.qty) || placement.qty <= 0) {
        continue;
      }

      let floor = floors.get(placement.floorId);

      if (!floor) {
        floor = {
          id: placement.floorId,
          label: placement.floorLabel,
          closets: [],
        };
        floors.set(placement.floorId, floor);
      }

      let closet = floor.closets.find(
        (item) => item.id === placement.closetId,
      );

      if (!closet) {
        closet = {
          id: placement.closetId,
          label: placement.closetLabel,
          items: [],
        };
        floor.closets.push(closet);
      }

      const existing = closet.items.find(
        (item) => item.nodeId === node.id,
      );

      if (existing) {
        existing.qty += placement.qty;
      } else {
        closet.items.push({
          nodeId: node.id,
          label: node.data.label,
          qty: placement.qty,
        });
      }
    }
  }

  return [...floors.values()]
    .sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true }),
    )
    .map((floor) => ({
      ...floor,
      closets: floor.closets
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((closet) => ({
          ...closet,
          items: closet.items.sort((a, b) =>
            a.nodeId.localeCompare(b.nodeId),
          ),
        })),
    }));
}

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * Per-floor, per-closet equipment list under the topology canvas.
 *
 * TOPO-003 follow-up:
 * - Each closet is a two-column table (Device | Qty). The quantity header
 *   appears once per closet instead of "Qty:" on every row, and the number
 *   column never wraps, so long model names wrap on the left only.
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
                <table
                  key={closet.id}
                  className="mt-2 w-full table-fixed border-collapse text-xs"
                >
                  <caption className="sr-only">
                    {closet.label}
                  </caption>
                  <colgroup>
                    <col />
                    <col className="w-12" />
                  </colgroup>
                  <thead>
                    <tr className="text-muted-foreground">
                      <th
                        scope="col"
                        className="pb-1 text-left font-medium"
                      >
                        Device
                      </th>
                      <th
                        scope="col"
                        className="pb-1 text-right font-medium"
                      >
                        Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {closet.items.map((item) => (
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
              ))}
            </div>
          ))}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
import { useMemo } from "react";
import type { TopologyFlowNode } from "./types";

interface FloorClosetBreakdownProps {
  nodes: TopologyFlowNode[];
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

export function FloorClosetBreakdown({
  nodes,
}: FloorClosetBreakdownProps) {
  const floors = useMemo(
    () => groupTopologyPlacements(nodes),
    [nodes],
  );

  if (floors.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-4 space-y-3"
      aria-label="Logical floor and closet grouping"
      data-testid="topology-floor-closet-breakdown"
    >
      <div>
        <h4 className="text-sm font-semibold">
          Logical Floor/Closet Breakdown
        </h4>
        <p className="text-xs text-muted-foreground">
          Deterministic planning approximation, not verified physical
          equipment placement.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {floors.map((floor) => (
          <div
            key={floor.id}
            className="rounded-lg border bg-card p-3"
            data-testid={`topology-floor-${floor.id}`}
          >
            <h5 className="text-sm font-semibold">
              {floor.label}
            </h5>

            {floor.closets.map((closet) => (
              <div key={closet.id} className="mt-2 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {closet.label}
                </p>

                <ul className="space-y-1">
                  {closet.items.map((item) => (
                    <li
                      key={item.nodeId}
                      className="flex justify-between gap-3 text-xs"
                    >
                      <span>{item.label}</span>
                      <span className="font-medium">
                        Qty: {item.qty}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
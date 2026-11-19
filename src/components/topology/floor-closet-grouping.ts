import type { TopologyFlowNode } from "./types";

/**
 * Per-floor, per-closet grouping of topology placements for the "Groups"
 * breakdown under the canvas (TOPO-002 AC4).
 *
 * Kept in a .ts module so floor-closet-breakdown.tsx exports only its
 * component (react-refresh/only-export-components; QA round 2 lint finding).
 * The logic is unchanged.
 */

export interface GroupedItem {
  nodeId: string;
  label: string;
  qty: number;
}

export interface ClosetGroup {
  id: string;
  label: string;
  items: GroupedItem[];
}

export interface FloorGroup {
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
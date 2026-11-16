import {
  TOPOLOGY_EDGE_TYPE,
  type FlowEdgeData,
  type FlowGraphResult,
  type TopologyFlowEdge,
  type TopologyFlowNode,
  type TopologyPlacement,
  type TopologyWarning,
} from './types';

/**
 * NWP-TOPO-003 (revised AC10 / AC5): group devices by the floor they serve.
 *
 * ENGINE-016 sends one plan-wide node per AP model and per client kind, each
 * with `placements` that split its quantity across floors. When a plan spans
 * two or more floors, this transform, which runs before layout:
 *
 * - tags each access switch with its floor (from its placement);
 * - replaces the AP node with one node per floor (qty = that floor's APs,
 *   planTotal = plan total, same single model);
 * - replaces wired PCs, Wi-Fi devices, VoIP phones and cameras with one
 *   grouped node per floor (count = that floor's devices);
 * - reconnects every per-floor node to the access switch(es) on the same
 *   floor, and every per-floor Wi-Fi group to the AP node on the same floor.
 *
 * The edges are rebuilt from the placements, not from the engine's per-switch
 * edge counts. The engine fills switches first-fit while it spreads placements
 * across floors round-robin, so the two can disagree. Using one source keeps
 * each floor consistent. Both are planning estimates; see the TOPO-003
 * AC10 change note for the ENGINE-016 follow-up that would make them agree.
 *
 * Single-floor plans, and plans without placements, are returned unchanged.
 * Pure function, deterministic for a given input.
 */

const SPLIT_CLIENT_KINDS = new Set([
  'wired_pcs',
  'wifi_devices',
  'voip_phones',
  'cameras',
]);

const trailingNumber = (id: string) => {
  const match = /(\d+)$/.exec(id);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

/** Floor 1, Floor 2, … Floor 10 (numeric, not lexical). */
export function compareFloorIds(a: string, b: string): number {
  return trailingNumber(a) - trailingNumber(b) || a.localeCompare(b);
}

function positivePlacements(node: TopologyFlowNode): TopologyPlacement[] {
  return (node.data.placements ?? []).filter(
    (placement) => Number.isFinite(placement.qty) && placement.qty > 0,
  );
}

/** Splits `total` across `parts` as evenly as possible; earlier parts take the remainder. */
function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(total / parts);
  const remainder = total % parts;
  return Array.from({ length: parts }, (_, index) =>
    base + (index < remainder ? 1 : 0),
  );
}

const isAccessSwitch = (node: TopologyFlowNode) =>
  node.data.role === 'switch' && node.data.layer !== 'core';

const isSplittable = (node: TopologyFlowNode) =>
  node.data.role === 'access_point' ||
  (node.data.role === 'client_group' &&
    SPLIT_CLIENT_KINDS.has(node.data.clientKind ?? ''));

function makeEdge(
  source: string,
  target: string,
  data: FlowEdgeData,
  count?: number,
): TopologyFlowEdge {
  const { count: _ignored, ...rest } = data;
  return {
    id: `edge-${source}--${target}`,
    source,
    target,
    type: TOPOLOGY_EDGE_TYPE,
    data: count !== undefined ? { ...rest, count } : rest,
  };
}

export function groupByFloor(graph: FlowGraphResult): FlowGraphResult {
  if (graph.status !== 'available') return graph;

  const { nodes, edges } = graph;

  const floorIds = new Set<string>();
  for (const node of nodes) {
    if (!isAccessSwitch(node) && !isSplittable(node)) continue;
    for (const placement of positivePlacements(node)) {
      floorIds.add(placement.floorId);
    }
  }

  if (floorIds.size < 2) return graph;

  const warnings: TopologyWarning[] = [...graph.warnings];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const outNodes: TopologyFlowNode[] = [];
  const switchesByFloor = new Map<string, string[]>();
  const replaced = new Map<string, TopologyFlowNode[]>();

  for (const node of nodes) {
    if (isAccessSwitch(node)) {
      const placement = positivePlacements(node)[0];

      if (!placement) {
        outNodes.push(node);
        continue;
      }

      outNodes.push({
        ...node,
        data: {
          ...node.data,
          floorId: placement.floorId,
          floorLabel: placement.floorLabel,
        },
      });

      const list = switchesByFloor.get(placement.floorId) ?? [];
      list.push(node.id);
      switchesByFloor.set(placement.floorId, list);
      continue;
    }

    if (isSplittable(node)) {
      const placements = [...positivePlacements(node)].sort((a, b) =>
        compareFloorIds(a.floorId, b.floorId),
      );

      if (placements.length === 0) {
        outNodes.push(node);
        continue;
      }

      const isAp = node.data.role === 'access_point';
      const parts: TopologyFlowNode[] = placements.map((placement) => ({
        id: `${node.id}--${placement.floorId}`,
        type: node.type,
        data: {
          ...node.data,
          ...(isAp
            ? { qty: placement.qty }
            : { count: placement.qty }),
          ...(isAp && typeof node.data.qty === 'number'
            ? { planTotal: node.data.qty }
            : {}),
          ...(!isAp && typeof node.data.count === 'number'
            ? { planTotal: node.data.count }
            : {}),
          placements: [{ ...placement }],
          floorId: placement.floorId,
          floorLabel: placement.floorLabel,
        },
      }));

      replaced.set(node.id, parts);
      outNodes.push(...parts);
      continue;
    }

    outNodes.push(node);
  }

  // Fallback attachment when a floor has no access switch: the first core
  // switch unit, or the gateway when there is no switch at all.
  const fallbackSourceId =
    nodes.find((node) => node.data.role === 'switch' && node.data.layer === 'core')
      ?.id ?? nodes.find((node) => node.data.role === 'gateway')?.id;

  const floorsWithoutSwitch = new Set<string>();
  const switchesFor = (floorId: string): string[] => {
    const list = switchesByFloor.get(floorId);
    if (list && list.length > 0) return list;
    floorsWithoutSwitch.add(floorId);
    return fallbackSourceId ? [fallbackSourceId] : [];
  };

  const apOriginal = nodes.find((node) => node.data.role === 'access_point');
  const apParts = apOriginal ? replaced.get(apOriginal.id) : undefined;
  const floorsWifiWithoutAp = new Set<string>();

  const apSourceFor = (floorId: string): string | undefined => {
    if (!apOriginal) return undefined;
    if (!apParts) return apOriginal.id;

    const sameFloor = apParts.find((part) => part.data.floorId === floorId);
    if (sameFloor) return sameFloor.id;

    floorsWifiWithoutAp.add(floorId);
    return apParts[0].id;
  };

  const templateFor = (originalId: string, fallback: FlowEdgeData) =>
    edges.find((edge) => edge.target === originalId)?.data ?? fallback;

  // Edges that touch no replaced node are kept as sent.
  const outEdges: TopologyFlowEdge[] = edges.filter(
    (edge) => !replaced.has(edge.source) && !replaced.has(edge.target),
  );

  for (const [originalId, parts] of replaced) {
    const original = nodeById.get(originalId)!;
    const isAp = original.data.role === 'access_point';
    const isWifi = original.data.clientKind === 'wifi_devices';

    const template = templateFor(originalId, {
      linkType: isAp ? 'poe' : 'access',
      medium: isWifi ? 'wireless' : 'copper',
    });

    for (const part of parts) {
      const floorId = part.data.floorId!;

      if (isWifi) {
        const source = apSourceFor(floorId);
        if (source) outEdges.push(makeEdge(source, part.id, template));
        continue;
      }

      const quantity = (isAp ? part.data.qty : part.data.count) ?? 0;
      const sources = switchesFor(floorId);

      splitEvenly(quantity, sources.length).forEach((count, index) => {
        if (count > 0) {
          outEdges.push(makeEdge(sources[index], part.id, template, count));
        }
      });
    }
  }

  // A group that was not split but hung off a split node (e.g. a Wi-Fi group
  // without placements under the AP) attaches to the first per-floor part.
  for (const edge of edges) {
    if (replaced.has(edge.source) && !replaced.has(edge.target)) {
      const firstPart = replaced.get(edge.source)![0];
      outEdges.push(
        makeEdge(firstPart.id, edge.target, edge.data ?? { linkType: 'access' }),
      );
    }
  }

  // "Other devices" has no count or placements; draw it in the zone of the
  // switch it hangs off, when that switch has a floor.
  const floorOf = new Map(
    outNodes
      .filter((node) => node.data.floorId)
      .map((node) => [node.id, node] as const),
  );

  const finalNodes = outNodes.map((node) => {
    if (node.data.floorId || node.data.role !== 'client_group') return node;

    const feeder = outEdges.find((edge) => edge.target === node.id);
    const host = feeder ? floorOf.get(feeder.source) : undefined;

    return host
      ? {
          ...node,
          data: {
            ...node.data,
            floorId: host.data.floorId,
            floorLabel: host.data.floorLabel,
          },
        }
      : node;
  });

  for (const floorId of [...floorsWithoutSwitch].sort(compareFloorIds)) {
    warnings.push({
      code: 'FLOOR_WITHOUT_ACCESS_SWITCH',
      message: `No access switch is placed on ${floorId}; its devices are drawn on the core switch.`,
    });
  }

  for (const floorId of [...floorsWifiWithoutAp].sort(compareFloorIds)) {
    warnings.push({
      code: 'FLOOR_WIFI_WITHOUT_AP',
      message: `Wi-Fi devices are placed on ${floorId}, which has no access point; they are drawn on another floor's access points.`,
    });
  }

  return {
    status: 'available',
    nodes: finalNodes,
    edges: outEdges,
    warnings,
  };
}
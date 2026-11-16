import dagre from '@dagrejs/dagre';
import type { Node as FlowNode } from '@xyflow/react';
import { SIDE_HANDLES } from './edge-routing';
import type {
  FlowNodeData,
  TopologyFlowEdge,
  TopologyFlowNode,
  TopologyWarning,
} from './types';

/**
 * TOPO-002 deterministic topology layout.
 *
 * Layout engine: @dagrejs/dagre.
 * Dagre is used because it supports directed hierarchical graphs.
 *
 * Determinism is supported by:
 * - Stable node and edge insertion order.
 * - Dimensions derived only from node data, with a fixed layout configuration.
 * - No random values or time-dependent calculations.
 *
 * TOPO-003 "spine" row (saves vertical space):
 * the Internet/WAN node(s), the gateway and the core switch unit(s) share the
 * top row and read left to right along the data path:
 *
 *   [Internet] → [Gateway] → [Core switch]
 *        firewall · controller · access switches
 *                    access points
 *                    client groups
 *
 * Dagre lays the spine out as one composite node at rank 0. Afterwards the
 * composite is expanded into its columns (WAN | gateway | core). Members of a
 * column with several units, such as dual WAN or two core switches, are
 * stacked vertically. Edges inside the spine get left/right side handles, so
 * they run horizontally.
 *
 * The cache is scoped by caller-provided plan identity and graph content.
 */

export const LAYOUT_CONFIG = {
  rankdir: 'TB',
  nodesep: 56,
  // Each logical rank sits between two invisible anchor ranks, so the visible
  // gap between card rows is about 2 × ranksep (90 px).
  ranksep: 45,
  edgesep: 24,
  marginx: 40,
  marginy: 40,
  align: 'UL',
  ranker: 'network-simplex',
} as const;

/** Horizontal gap between spine columns (room for the "WAN" / "Uplink" labels). */
const SPINE_COLUMN_GAP = 80;
/** Vertical gap between stacked units in one spine column. */
const SPINE_STACK_GAP = 24;
const SPINE_ID = '__topo_spine';

// ---- Node dimensions (TOPO-003) ----------------------------------------------
// Heights are derived from what each card shows, so cards have no empty band.
// The metrics mirror topology-nodes.tsx and round up slightly, so text is never clipped.

const NODE_WIDTHS: Record<string, number> = {
  wan: 210,
  gateway: 260,
  firewall: 240,
  controller: 240,
  switch: 240,
  access_point: 240,
  client_group: 210,
  default: 240,
};

const FIXED_HEIGHTS: Record<string, number> = {
  wan: 64,
  client_group: 64,
};

const CARD_METRICS = {
  padding: 20, // p-2.5 top + bottom
  header: 46, // icon tile (40) beside role, name and SKU lines (3 × 15)
  rowGap: 6, // gap-1.5
  detail: 15,
  badgeRow: 20, // h-5
  badgeGap: 4, // gap-1
};

const BADGE_TEXT = {
  firewall: 'Integrated firewall',
  controller: 'Integrated controller',
  integratedWith: 'Integrated in gateway',
  sunsetting: 'Sunsetting · confirm availability',
} as const;

/** Badge width estimate: icon + gap + padding + border, plus 10 px semibold text. */
const estimateBadgeWidth = (text: string) => 32 + text.length * 5.8;

function badgeTexts(data: FlowNodeData): string[] {
  const texts: string[] = [];

  if (data.role === 'gateway') {
    for (const fn of data.integrates ?? []) {
      texts.push(
        fn === 'firewall'
          ? BADGE_TEXT.firewall
          : fn === 'controller'
            ? BADGE_TEXT.controller
            : `Integrated ${fn}`,
      );
    }
  }

  if (data.role === 'firewall' && data.integratedWith) {
    texts.push(BADGE_TEXT.integratedWith);
  }

  if (data.status === 'SUNSETTING') texts.push(BADGE_TEXT.sunsetting);

  return texts;
}

/** Greedy wrap, matching the flex-wrap badge row. */
function badgeRowCount(texts: string[], available: number): number {
  let rows = 0;
  let used = 0;

  for (const text of texts) {
    const width = estimateBadgeWidth(text);

    if (rows === 0 || used + CARD_METRICS.badgeGap + width > available) {
      rows += 1;
      used = width;
    } else {
      used += CARD_METRICS.badgeGap + width;
    }
  }

  return rows;
}

function hasDetailLine(data: FlowNodeData): boolean {
  return (
    data.role === 'firewall' ||
    (data.role === 'access_point' && typeof data.qty === 'number')
  );
}

export function getNodeDimensions(node: TopologyFlowNode): {
  width: number;
  height: number;
} {
  const role = node.data.role;
  const width = NODE_WIDTHS[role] ?? NODE_WIDTHS.default;

  const fixed = FIXED_HEIGHTS[role];
  if (fixed !== undefined) return { width, height: fixed };

  let height = CARD_METRICS.padding + CARD_METRICS.header;

  if (hasDetailLine(node.data)) {
    height += CARD_METRICS.rowGap + CARD_METRICS.detail;
  }

  const rows = badgeRowCount(
    badgeTexts(node.data),
    width - CARD_METRICS.padding,
  );

  if (rows > 0) {
    height +=
      CARD_METRICS.rowGap +
      rows * CARD_METRICS.badgeRow +
      (rows - 1) * CARD_METRICS.badgeGap;
  }

  return { width, height: Math.ceil(height) };
}

// ---- Ranks and spine ---------------------------------------------------------

/** 0 = WAN column, 1 = gateway column, 2 = core column; -1 = not in the spine. */
function spineColumn(node: TopologyFlowNode): number {
  const { role, layer } = node.data;

  if (role === 'wan') return 0;
  if (role === 'gateway') return 1;
  if (role === 'switch' && layer === 'core') return 2;

  return -1;
}

function getNodeRank(node: TopologyFlowNode): number {
  if (spineColumn(node) >= 0) return 0;

  const role = node.data.role;

  if (role === 'firewall' || role === 'controller') return 1;
  if (role === 'switch') return 1;
  if (role === 'access_point') return 2;
  if (role === 'client_group') return 3;

  return 4;
}

// ---- Cache -------------------------------------------------------------------

const CACHE_LIMIT = 20;

const layoutCache = new Map<string, PositionedFlowGraph>();

export interface PositionedFlowGraph {
  status: 'available';
  nodes: FlowNode<FlowNodeData>[];
  edges: TopologyFlowEdge[];
  warnings: TopologyWarning[];
}

type LayoutInput = {
  nodes: TopologyFlowNode[];
  edges: TopologyFlowEdge[];
  warnings: TopologyWarning[];
};

function stableGraphFingerprint(graph: LayoutInput): string {
  const nodes = [...graph.nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((node) => ({
      id: node.id,
      type: node.type,
      data: node.data,
    }));

  const edges = [...graph.edges]
    .sort(
      (a, b) =>
        a.id.localeCompare(b.id) ||
        a.source.localeCompare(b.source) ||
        a.target.localeCompare(b.target),
    )
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      // TOPO-003: every edge shares one `type`, so the link type and medium
      // now live in data and must be part of the fingerprint.
      data: edge.data,
    }));

  return JSON.stringify({ nodes, edges });
}

function cloneResult(result: PositionedFlowGraph): PositionedFlowGraph {
  return {
    ...result,
    nodes: result.nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      data: { ...node.data },
    })),
    edges: result.edges.map((edge) => ({
      ...edge,
      data: edge.data ? { ...edge.data } : undefined,
    })),
    warnings: [...result.warnings],
  };
}

function rememberLayout(
  key: string,
  result: PositionedFlowGraph,
): void {
  if (layoutCache.has(key)) {
    layoutCache.delete(key);
  }

  layoutCache.set(key, cloneResult(result));

  while (layoutCache.size > CACHE_LIMIT) {
    const oldestKey = layoutCache.keys().next().value;

    if (oldestKey === undefined) break;

    layoutCache.delete(oldestKey);
  }
}

/**
 * Computes deterministic React Flow positions.
 *
 * cacheKey should identify the generated plan, preferably:
 * generation timestamp + vendor + plan tier.
 *
 * The graph fingerprint prevents stale cache hits when graph content changes.
 */
export function layoutGraph(
  graph: LayoutInput,
  cacheKey?: string,
): PositionedFlowGraph {
  const fingerprint = stableGraphFingerprint(graph);
  const key = cacheKey
    ? `${cacheKey}::${fingerprint}`
    : undefined;

  if (key) {
    const cached = layoutCache.get(key);

    if (cached) {
      // Refresh insertion order for bounded LRU-like eviction.
      layoutCache.delete(key);
      layoutCache.set(key, cached);

      return cloneResult(cached);
    }
  }

  const sortedNodes = [...graph.nodes].sort(
    (a, b) =>
      getNodeRank(a) - getNodeRank(b) ||
      a.id.localeCompare(b.id),
  );

  const sortedEdges = [...graph.edges].sort(
    (a, b) =>
      a.id.localeCompare(b.id) ||
      a.source.localeCompare(b.source) ||
      a.target.localeCompare(b.target),
  );

  const nodeById = new Map(
    sortedNodes.map((node) => [node.id, node]),
  );

  const dimensions = new Map(
    sortedNodes.map((node) => [node.id, getNodeDimensions(node)]),
  );

  // ---- Spine composite ----
  const columns: TopologyFlowNode[][] = [[], [], []];
  for (const node of sortedNodes) {
    const column = spineColumn(node);
    if (column >= 0) columns[column].push(node);
  }

  const activeColumns = columns
    .map((members, index) => ({ index, members }))
    .filter((column) => column.members.length > 0)
    .map((column) => {
      const width = Math.max(
        ...column.members.map((node) => dimensions.get(node.id)!.width),
      );
      const height =
        column.members.reduce(
          (sum, node) => sum + dimensions.get(node.id)!.height,
          0,
        ) +
        SPINE_STACK_GAP * (column.members.length - 1);

      return { ...column, width, height };
    });

  const spineMemberColumn = new Map<string, number>();
  for (const column of activeColumns) {
    for (const node of column.members) {
      spineMemberColumn.set(node.id, column.index);
    }
  }

  const hasSpine = activeColumns.length > 0;
  const spineWidth =
    activeColumns.reduce((sum, column) => sum + column.width, 0) +
    SPINE_COLUMN_GAP * Math.max(0, activeColumns.length - 1);
  const spineHeight = Math.max(
    0,
    ...activeColumns.map((column) => column.height),
  );

  const layoutIdOf = (id: string) =>
    spineMemberColumn.has(id) ? SPINE_ID : id;

  // ---- Dagre graph ----
  const dagreGraph = new dagre.graphlib.Graph({
    multigraph: true,
  });

  dagreGraph.setGraph({ ...LAYOUT_CONFIG });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const layoutNodes: { id: string; rank: number }[] = [];

  if (hasSpine) {
    dagreGraph.setNode(SPINE_ID, {
      width: spineWidth,
      height: spineHeight,
      rank: 0,
    });
    layoutNodes.push({ id: SPINE_ID, rank: 0 });
  }

  for (const node of sortedNodes) {
    if (spineMemberColumn.has(node.id)) continue;

    const rank = getNodeRank(node);

    dagreGraph.setNode(node.id, {
      ...dimensions.get(node.id)!,
      rank,
    });
    layoutNodes.push({ id: node.id, rank });
  }

  // Invisible rank anchors enforce the intended top-to-bottom hierarchy,
  // including for nodes that have no connecting edges.
  const maxRank = Math.max(0, ...layoutNodes.map((node) => node.rank));

  const anchorIds: string[] = [];

  for (let rank = 0; rank <= maxRank + 1; rank += 1) {
    const anchorId = `__topo_rank_anchor_${rank}`;

    anchorIds.push(anchorId);

    dagreGraph.setNode(anchorId, {
      width: 0,
      height: 0,
    });

    if (rank > 0) {
      dagreGraph.setEdge(
        anchorIds[rank - 1],
        anchorId,
        { weight: 100 },
      );
    }
  }

  for (const node of layoutNodes) {
    dagreGraph.setEdge(anchorIds[node.rank], node.id, { weight: 100 });
    dagreGraph.setEdge(node.id, anchorIds[node.rank + 1], { weight: 100 });
  }

  const rankOfLayoutId = new Map(
    layoutNodes.map((node) => [node.id, node.rank]),
  );

  // Preserve actual React Flow edges, but orient layout constraints
  // according to the intended visual hierarchy. Edges inside the spine are
  // placed by the spine expansion, not by dagre.
  for (const edge of sortedEdges) {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) continue;

    const from0 = layoutIdOf(edge.source);
    const to0 = layoutIdOf(edge.target);

    if (from0 === to0) continue;

    const sourceRank = rankOfLayoutId.get(from0) ?? 0;
    const targetRank = rankOfLayoutId.get(to0) ?? 0;

    const from = sourceRank <= targetRank ? from0 : to0;
    const to = sourceRank <= targetRank ? to0 : from0;

    dagreGraph.setEdge(from, to, { weight: 2 }, edge.id);
  }

  dagre.layout(dagreGraph);

  // ---- Positions ----
  const positions = new Map<string, { x: number; y: number }>();

  if (hasSpine) {
    const spine = dagreGraph.node(SPINE_ID);
    let columnLeft = spine.x - spineWidth / 2;

    for (const column of activeColumns) {
      let top = spine.y - column.height / 2;

      for (const node of column.members) {
        const size = dimensions.get(node.id)!;

        positions.set(node.id, {
          x: columnLeft + (column.width - size.width) / 2,
          y: top,
        });

        top += size.height + SPINE_STACK_GAP;
      }

      columnLeft += column.width + SPINE_COLUMN_GAP;
    }
  }

  const nodes: FlowNode<FlowNodeData>[] = sortedNodes.map((node) => {
    const size = dimensions.get(node.id)!;
    let position = positions.get(node.id);

    if (!position) {
      const positioned = dagreGraph.node(node.id);
      position = {
        x: positioned.x - size.width / 2,
        y: positioned.y - size.height / 2,
      };
    }

    return {
      ...node,
      position,
      width: size.width,
      height: size.height,
    };
  });

  // Spine edges run horizontally between the facing sides of the columns.
  const edges: TopologyFlowEdge[] = sortedEdges.map((edge) => {
    const sourceColumn = spineMemberColumn.get(edge.source);
    const targetColumn = spineMemberColumn.get(edge.target);

    if (
      sourceColumn === undefined ||
      targetColumn === undefined ||
      sourceColumn === targetColumn
    ) {
      return edge;
    }

    const leftToRight = sourceColumn < targetColumn;

    return {
      ...edge,
      sourceHandle: leftToRight
        ? SIDE_HANDLES.sourceRight
        : SIDE_HANDLES.sourceLeft,
      targetHandle: leftToRight
        ? SIDE_HANDLES.targetLeft
        : SIDE_HANDLES.targetRight,
    };
  });

  const result: PositionedFlowGraph = {
    status: 'available',
    nodes,
    edges,
    warnings: [...graph.warnings],
  };

  if (key) {
    rememberLayout(key, result);
  }

  return cloneResult(result);
}

/** Clears cached layouts. Useful for isolated tests. */
export function clearLayoutCache(): void {
  layoutCache.clear();
}
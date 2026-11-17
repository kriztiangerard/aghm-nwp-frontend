import dagre from '@dagrejs/dagre';
import type { Node as FlowNode } from '@xyflow/react';
import { SIDE_HANDLES } from './edge-routing';
import { compareFloorIds, groupByFloor } from './floor-grouping';
import type {
  FlowNodeData,
  TopologyFlowEdge,
  TopologyFlowNode,
  TopologyWarning,
} from './types';

/**
 * TOPO-002 deterministic topology layout, extended by TOPO-003.
 *
 * Determinism is supported by:
 * - Stable node and edge ordering (sorted by rank/floor, then id).
 * - Dimensions derived only from node data, with a fixed configuration.
 * - No random values or time-dependent calculations.
 *
 * layoutGraph() first runs groupByFloor() (floor-grouping.ts), so
 * multi-floor plans are split per floor before positioning.
 *
 * Two layout paths, both deterministic:
 *
 * 1. Structured layout (any plan with an Internet, gateway or core switch node).
 *    Multi-floor plans look like this:
 *
 *      [Internet] → [Gateway] → [Core switch]            ← top row ("spine")
 *
 *      Firewall    ┌ Floor 1 ──────────┐ ┌ Floor 2 ──────────┐
 *      Controller  │  Access switch    │ │  Access switch    │
 *                  │  APs  PCs  Phones │ │  APs  PCs  Cams   │
 *                  │  Wi-Fi devices    │ │  Wi-Fi devices    │
 *                  └───────────────────┘ └───────────────────┘
 *
 *    Single-floor plans use the same arrangement with one device block and
 *    no zone. Positions are computed directly. The structure is regular, so a
 *    fixed arrangement reads more predictably than dagre would, and no device
 *    edge passes behind the firewall or controller. Zones are returned in
 *    `zones` for the canvas to draw.
 *
 * 2. Dagre layout: a fallback for graphs with no top-row node, using the
 *    TOPO-002 dagre hierarchy.
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

/** Horizontal gap between top-row columns (room for the "WAN" / "Uplink" labels). */
const SPINE_COLUMN_GAP = 80;
/** Vertical gap between stacked units in one top-row column. */
const SPINE_STACK_GAP = 24;
const SPINE_ID = '__topo_spine';

const FLOOR_LAYOUT = {
  margin: 40,
  spineToRow: 96,
  zonePadX: 20,
  zonePadTop: 48, // room for the floor label pill
  zonePadBottom: 20,
  zoneGap: 40,
  rowGap: 64, // room for edge labels between rows
  nodeGap: 24,
  servicesGap: 48,
};

export interface TopologyZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---- Node dimensions (TOPO-003) ----------------------------------------------
// Heights are derived from what each card shows. The metrics mirror the
// classes in topology-nodes.tsx and round up slightly, so text is never clipped.

const NODE_WIDTHS: Record<string, number> = {
  wan: 180,
  gateway: 220,
  firewall: 200,
  controller: 200,
  switch: 200,
  access_point: 200,
  client_group: 170,
  default: 200,
};

const CARD_METRICS = {
  padX: 24, // px-3 left + right
  padY: 24, // py-3 top + bottom
  tile: 48, // size-12 icon tile
  gap: 6, // gap-1.5
  line: 15, // leading-[15px]
  badgeRow: 20, // h-5
  badgeGap: 4, // gap-1
  sunsettingBadge: 36, // full-width badge, up to two lines
};

/** Compact cards (internet, client groups): tile + two text lines. */
const COMPACT_HEIGHT =
  CARD_METRICS.padY + CARD_METRICS.tile + CARD_METRICS.gap + 2 * CARD_METRICS.line;

const BADGE_TEXT = {
  firewall: 'Integrated firewall',
  controller: 'Integrated controller',
  integratedWith: 'Integrated in gateway',
} as const;

/** Badge width estimate: icon + gap + padding + border, plus 10 px semibold text. */
const estimateBadgeWidth = (text: string) => 32 + text.length * 5.8;

function pillBadgeTexts(data: FlowNodeData): string[] {
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

  return texts;
}

/** Greedy wrap, matching the flex-wrap badge row. */
function pillRowCount(texts: string[], available: number): number {
  let rows = 0;
  let used = 0;

  for (const text of texts) {
    const width = Math.min(estimateBadgeWidth(text), available);

    if (rows === 0 || used + CARD_METRICS.badgeGap + width > available) {
      rows += 1;
      used = width;
    } else {
      used += CARD_METRICS.badgeGap + width;
    }
  }

  return rows;
}

/** Product-name width estimate: 12 px semibold, rounded up so a name that
 * might wrap always gets its second line (an extra line is harmless; a
 * missing one would clip the name). */
const estimateNameWidth = (text: string) => text.length * 7;

/** Lines the product name takes: 1 or 2 (NAME_CLASS clamps at two). */
function nameLineCount(data: FlowNodeData, width: number): number {
  const name = data.name ?? data.label ?? '';
  const available = width - CARD_METRICS.padX;
  return Math.min(2, Math.max(1, Math.ceil(estimateNameWidth(name) / available)));
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

  if (role === 'wan' || role === 'client_group') {
    return { width, height: COMPACT_HEIGHT };
  }

  // Role line + product name (1-2 lines) + SKU line.
  const textLines =
    1 + nameLineCount(node.data, width) + (node.data.sku ? 1 : 0);
  let height =
    CARD_METRICS.padY +
    CARD_METRICS.tile +
    CARD_METRICS.gap +
    textLines * CARD_METRICS.line;

  if (hasDetailLine(node.data)) {
    height += CARD_METRICS.gap + CARD_METRICS.line;
  }

  const pillRows = pillRowCount(
    pillBadgeTexts(node.data),
    width - CARD_METRICS.padX,
  );
  const sunsetting = node.data.status === 'SUNSETTING';

  if (pillRows > 0 || sunsetting) {
    height += CARD_METRICS.gap;
    if (pillRows > 0) {
      height +=
        pillRows * CARD_METRICS.badgeRow +
        (pillRows - 1) * CARD_METRICS.badgeGap;
    }
    if (sunsetting) {
      height +=
        (pillRows > 0 ? CARD_METRICS.badgeGap : 0) +
        CARD_METRICS.sunsettingBadge;
    }
  }

  return { width, height: Math.ceil(height) };
}

type Size = { width: number; height: number };
type Point = { x: number; y: number };

// ---- Ranks and the top row -----------------------------------------------------

/** 0 = Internet column, 1 = gateway column, 2 = core column; -1 = not in the top row. */
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

interface SpineColumn {
  index: number;
  members: TopologyFlowNode[];
  width: number;
  height: number;
}

function buildSpine(
  sortedNodes: TopologyFlowNode[],
  dimensions: Map<string, Size>,
) {
  const buckets: TopologyFlowNode[][] = [[], [], []];
  for (const node of sortedNodes) {
    const column = spineColumn(node);
    if (column >= 0) buckets[column].push(node);
  }

  const columns: SpineColumn[] = buckets
    .map((members, index) => ({ index, members }))
    .filter((column) => column.members.length > 0)
    .map((column) => ({
      ...column,
      width: Math.max(
        ...column.members.map((node) => dimensions.get(node.id)!.width),
      ),
      height:
        column.members.reduce(
          (sum, node) => sum + dimensions.get(node.id)!.height,
          0,
        ) +
        SPINE_STACK_GAP * (column.members.length - 1),
    }));

  const memberColumn = new Map<string, number>();
  for (const column of columns) {
    for (const node of column.members) memberColumn.set(node.id, column.index);
  }

  return {
    columns,
    memberColumn,
    width:
      columns.reduce((sum, column) => sum + column.width, 0) +
      SPINE_COLUMN_GAP * Math.max(0, columns.length - 1),
    height: Math.max(0, ...columns.map((column) => column.height)),
  };
}

type Spine = ReturnType<typeof buildSpine>;

/** Places top-row members, centred vertically on `centerY`, starting at `left`. */
function placeSpine(
  spine: Spine,
  left: number,
  centerY: number,
  dimensions: Map<string, Size>,
  positions: Map<string, Point>,
): void {
  let columnLeft = left;

  for (const column of spine.columns) {
    let top = centerY - column.height / 2;

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

// ---- Structured layout (top row, services, device blocks) ---------------------
//
// Used for every plan that has a top row (Internet / gateway / core switch).
// QA fix (TOPO-003 AC6): single-floor plans used dagre, which put the
// controller in the row between the core switch and the access points, so
// the PoE edge and its label ran behind the controller card. Now:
// - the firewall and controller sit side by side directly under the gateway;
// - every switch, access point and client group sits in a device block under
//   the core switch, to the right of the services, so device edges never pass
//   behind a services card;
// - inside a block: access switches on the first row, access points and
//   switch-fed client groups on the second, and AP-fed client groups (Wi-Fi
//   devices) on the third, each directly under the access point it connects
//   through.
// Multi-floor plans get one block per floor, drawn as a labelled zone. Devices
// without a floor share one block that has no zone.

const ROW1_CLIENT_ORDER = ['wired_pcs', 'voip_phones', 'cameras', 'other_devices'];

function row1Order(node: TopologyFlowNode): number {
  if (node.data.role === 'access_point') return 0;
  const index = ROW1_CLIENT_ORDER.indexOf(node.data.clientKind ?? '');
  return index >= 0 ? 1 + index : ROW1_CLIENT_ORDER.length + 1;
}

const UNZONED = '__unzoned';
const DEVICE_ROLES = new Set(['switch', 'access_point', 'client_group']);

interface BlockDraft {
  id: string;
  label: string;
  zoned: boolean;
  width: number;
  height: number;
  local: Map<string, Point>;
}

function layoutBlock(
  id: string,
  label: string,
  zoned: boolean,
  members: TopologyFlowNode[],
  feederAp: Map<string, string>,
  dimensions: Map<string, Size>,
  padTop: number,
): BlockDraft {
  const L = FLOOR_LAYOUT;
  const padX = zoned ? L.zonePadX : 0;
  const padBottom = zoned ? L.zonePadBottom : 0;
  const width = (node: TopologyFlowNode) => dimensions.get(node.id)!.width;
  const height = (node: TopologyFlowNode) => dimensions.get(node.id)!.height;

  const rows: TopologyFlowNode[][] = [[], [], []];
  for (const node of members) {
    if (node.data.role === 'switch') rows[0].push(node);
    else if (feederAp.has(node.id)) rows[2].push(node);
    else rows[1].push(node);
  }

  rows[0].sort((a, b) => a.id.localeCompare(b.id));
  rows[1].sort((a, b) => row1Order(a) - row1Order(b) || a.id.localeCompare(b.id));

  const apOrder = new Map(
    rows[1]
      .filter((node) => node.data.role === 'access_point')
      .map((node, index) => [node.id, index] as const),
  );
  rows[2].sort(
    (a, b) =>
      (apOrder.get(feederAp.get(a.id)!) ?? Number.MAX_SAFE_INTEGER) -
        (apOrder.get(feederAp.get(b.id)!) ?? Number.MAX_SAFE_INTEGER) ||
      row1Order(a) - row1Order(b) ||
      a.id.localeCompare(b.id),
  );

  const rowWidth = (row: TopologyFlowNode[]) =>
    row.reduce((sum, node) => sum + width(node), 0) +
    L.nodeGap * Math.max(0, row.length - 1);
  const rowHeight = (row: TopologyFlowNode[]) =>
    Math.max(0, ...row.map(height));

  const innerWidth = Math.max(1, ...rows.map(rowWidth));
  const local = new Map<string, Point>();
  let y = padTop;
  let placedRows = 0;

  rows.forEach((row, rowIndex) => {
    if (row.length === 0) return;
    if (placedRows > 0) y += L.rowGap;

    const h = rowHeight(row);
    const place = (node: TopologyFlowNode, x: number) =>
      local.set(node.id, { x, y: y + (h - height(node)) / 2 });

    if (rowIndex < 2) {
      let x = padX + (innerWidth - rowWidth(row)) / 2;
      for (const node of row) {
        place(node, x);
        x += width(node) + L.nodeGap;
      }
    } else {
      // Each AP's clients are centred under that AP, swept left to right so
      // they never overlap, then pulled back inside the block if needed.
      const groups = new Map<string, TopologyFlowNode[]>();
      for (const node of row) {
        const key = feederAp.get(node.id)!;
        groups.set(key, [...(groups.get(key) ?? []), node]);
      }

      const placed: { node: TopologyFlowNode; x: number }[] = [];
      let cursor = padX;

      for (const [apId, group] of groups) {
        const apPoint = local.get(apId);
        const apCenter = apPoint
          ? apPoint.x + dimensions.get(apId)!.width / 2
          : padX + innerWidth / 2;

        let x = Math.max(cursor, apCenter - rowWidth(group) / 2);
        for (const node of group) {
          placed.push({ node, x });
          x += width(node) + L.nodeGap;
        }
        cursor = x;
      }

      const last = placed[placed.length - 1];
      const overflow = last.x + width(last.node) - (padX + innerWidth);
      const shift = overflow > 0 ? Math.min(overflow, placed[0].x - padX) : 0;
      for (const { node, x } of placed) place(node, x - shift);
    }

    y += h;
    placedRows += 1;
  });

  return {
    id,
    label,
    zoned,
    width: innerWidth + 2 * padX,
    height: y + padBottom,
    local,
  };
}

function structuredLayout(
  sortedNodes: TopologyFlowNode[],
  sortedEdges: TopologyFlowEdge[],
  dimensions: Map<string, Size>,
  spine: Spine,
): { positions: Map<string, Point>; zones: TopologyZone[] } {
  const L = FLOOR_LAYOUT;
  const positions = new Map<string, Point>();
  const nodeById = new Map(sortedNodes.map((node) => [node.id, node]));

  // Client groups reached through an access point (Wi-Fi devices) go under it.
  const feederAp = new Map<string, string>();
  for (const edge of sortedEdges) {
    if (
      nodeById.get(edge.source)?.data.role === 'access_point' &&
      nodeById.get(edge.target)?.data.role === 'client_group' &&
      !feederAp.has(edge.target)
    ) {
      feederAp.set(edge.target, edge.source);
    }
  }

  const blocks = new Map<string, { label: string; members: TopologyFlowNode[] }>();
  const services: TopologyFlowNode[] = [];

  for (const node of sortedNodes) {
    if (spine.memberColumn.has(node.id)) continue;

    if (!DEVICE_ROLES.has(node.data.role)) {
      services.push(node); // firewall, controller, unknown roles
      continue;
    }

    const key = node.data.floorId ?? UNZONED;
    const block = blocks.get(key) ?? {
      label: node.data.floorLabel ?? key,
      members: [],
    };
    block.members.push(node);
    blocks.set(key, block);
  }

  services.sort(
    (a, b) =>
      (a.data.role === 'firewall' ? -1 : b.data.role === 'firewall' ? 1 : 0) ||
      getNodeRank(a) - getNodeRank(b) ||
      a.id.localeCompare(b.id),
  );

  // When any floor zone exists, every block and the services start below the
  // zone label band, so the first rows line up across the page.
  const anyZoned = [...blocks.keys()].some((key) => key !== UNZONED);
  const contentTop = anyZoned ? L.zonePadTop : 0;

  const drafts = [...blocks.entries()]
    .sort(([a], [b]) =>
      a === UNZONED ? -1 : b === UNZONED ? 1 : compareFloorIds(a, b),
    )
    .map(([key, block]) =>
      layoutBlock(
        key,
        block.label,
        key !== UNZONED,
        block.members,
        feederAp,
        dimensions,
        contentTop,
      ),
    );

  const servicesWidth =
    services.reduce((sum, node) => sum + dimensions.get(node.id)!.width, 0) +
    L.nodeGap * Math.max(0, services.length - 1);

  const rowWidth =
    (services.length > 0 ? servicesWidth + L.servicesGap : 0) +
    drafts.reduce((sum, block) => sum + block.width, 0) +
    L.zoneGap * Math.max(0, drafts.length - 1);

  // Horizontal alignment. With a services block, the gateway sits directly
  // above it and the core switch above the device blocks, so the gateway's
  // links and the core's links never share a horizontal run. Without one,
  // both rows are centred.
  let spineLeft: number;
  let rowLeft: number;

  const gatewayColumnIndex = spine.columns.findIndex((column) => column.index === 1);

  if (services.length > 0 && gatewayColumnIndex >= 0) {
    const gatewayOffset =
      spine.columns
        .slice(0, gatewayColumnIndex)
        .reduce((sum, column) => sum + column.width + SPINE_COLUMN_GAP, 0) +
      spine.columns[gatewayColumnIndex].width / 2;

    rowLeft = L.margin;
    spineLeft = rowLeft + servicesWidth / 2 - gatewayOffset;

    if (spineLeft < L.margin) {
      rowLeft += L.margin - spineLeft;
      spineLeft = L.margin;
    }
  } else {
    const overallWidth = Math.max(rowWidth, spine.width);
    spineLeft = L.margin + (overallWidth - spine.width) / 2;
    rowLeft = L.margin + (overallWidth - rowWidth) / 2;
  }

  placeSpine(spine, spineLeft, L.margin + spine.height / 2, dimensions, positions);

  const rowTop = L.margin + spine.height + L.spineToRow;
  let x = rowLeft;

  if (services.length > 0) {
    let serviceX = x;
    for (const node of services) {
      positions.set(node.id, { x: serviceX, y: rowTop + contentTop });
      serviceX += dimensions.get(node.id)!.width + L.nodeGap;
    }
    x += servicesWidth + L.servicesGap;
  }

  const zones: TopologyZone[] = [];
  for (const block of drafts) {
    for (const [id, point] of block.local) {
      positions.set(id, { x: x + point.x, y: rowTop + point.y });
    }
    if (block.zoned) {
      zones.push({
        id: block.id,
        label: block.label,
        x,
        y: rowTop,
        width: block.width,
        height: block.height,
      });
    }
    x += block.width + L.zoneGap;
  }

  return { positions, zones };
}

// ---- Dagre layout ----------------------------------------------------------------

function dagreLayout(
  sortedNodes: TopologyFlowNode[],
  sortedEdges: TopologyFlowEdge[],
  dimensions: Map<string, Size>,
  spine: Spine,
): Map<string, Point> {
  const nodeIds = new Set(sortedNodes.map((node) => node.id));
  const hasSpine = spine.columns.length > 0;
  const layoutIdOf = (id: string) =>
    spine.memberColumn.has(id) ? SPINE_ID : id;

  const dagreGraph = new dagre.graphlib.Graph({ multigraph: true });
  dagreGraph.setGraph({ ...LAYOUT_CONFIG });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const layoutNodes: { id: string; rank: number }[] = [];

  if (hasSpine) {
    dagreGraph.setNode(SPINE_ID, {
      width: spine.width,
      height: spine.height,
      rank: 0,
    });
    layoutNodes.push({ id: SPINE_ID, rank: 0 });
  }

  for (const node of sortedNodes) {
    if (spine.memberColumn.has(node.id)) continue;

    const rank = getNodeRank(node);
    dagreGraph.setNode(node.id, { ...dimensions.get(node.id)!, rank });
    layoutNodes.push({ id: node.id, rank });
  }

  // Invisible rank anchors enforce the intended top-to-bottom hierarchy,
  // including for nodes that have no connecting edges.
  const maxRank = Math.max(0, ...layoutNodes.map((node) => node.rank));
  const anchorIds: string[] = [];

  for (let rank = 0; rank <= maxRank + 1; rank += 1) {
    const anchorId = `__topo_rank_anchor_${rank}`;
    anchorIds.push(anchorId);
    dagreGraph.setNode(anchorId, { width: 0, height: 0 });

    if (rank > 0) {
      dagreGraph.setEdge(anchorIds[rank - 1], anchorId, { weight: 100 });
    }
  }

  for (const node of layoutNodes) {
    dagreGraph.setEdge(anchorIds[node.rank], node.id, { weight: 100 });
    dagreGraph.setEdge(node.id, anchorIds[node.rank + 1], { weight: 100 });
  }

  const rankOf = new Map(layoutNodes.map((node) => [node.id, node.rank]));

  // Orient layout constraints by the intended hierarchy. Edges inside the top
  // row are placed by the row itself, not by dagre.
  for (const edge of sortedEdges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;

    const from0 = layoutIdOf(edge.source);
    const to0 = layoutIdOf(edge.target);
    if (from0 === to0) continue;

    const forward = (rankOf.get(from0) ?? 0) <= (rankOf.get(to0) ?? 0);
    dagreGraph.setEdge(
      forward ? from0 : to0,
      forward ? to0 : from0,
      { weight: 2 },
      edge.id,
    );
  }

  dagre.layout(dagreGraph);

  const positions = new Map<string, Point>();

  if (hasSpine) {
    const center = dagreGraph.node(SPINE_ID);
    placeSpine(spine, center.x - spine.width / 2, center.y, dimensions, positions);
  }

  for (const node of sortedNodes) {
    if (positions.has(node.id)) continue;
    const positioned = dagreGraph.node(node.id);
    const size = dimensions.get(node.id)!;
    positions.set(node.id, {
      x: positioned.x - size.width / 2,
      y: positioned.y - size.height / 2,
    });
  }

  return positions;
}

// ---- Cache -------------------------------------------------------------------

const CACHE_LIMIT = 20;

const layoutCache = new Map<string, PositionedFlowGraph>();

export interface PositionedFlowGraph {
  status: 'available';
  nodes: FlowNode<FlowNodeData>[];
  edges: TopologyFlowEdge[];
  /** TOPO-003: floor zones to draw behind the devices (empty without floors). */
  zones: TopologyZone[];
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
      // live in data and must be part of the fingerprint.
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
    zones: result.zones.map((zone) => ({ ...zone })),
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

  // TOPO-003 (revised AC5/AC10, AC11): split APs and client groups per floor
  // here, so every caller of the layout gets the per-floor graph and zones,
  // whichever component renders the canvas. No-op for single-floor graphs and
  // for graphs that are already grouped.
  const grouped = groupByFloor({ status: 'available', ...graph });
  const input: LayoutInput =
    grouped.status === 'available' ? grouped : graph;

  const sortedNodes = [...input.nodes].sort(
    (a, b) =>
      getNodeRank(a) - getNodeRank(b) ||
      a.id.localeCompare(b.id),
  );

  const sortedEdges = [...input.edges].sort(
    (a, b) =>
      a.id.localeCompare(b.id) ||
      a.source.localeCompare(b.source) ||
      a.target.localeCompare(b.target),
  );

  const dimensions = new Map(
    sortedNodes.map((node) => [node.id, getNodeDimensions(node)]),
  );

  const spine = buildSpine(sortedNodes, dimensions);

  let positions: Map<string, Point>;
  let zones: TopologyZone[] = [];

  if (spine.columns.length > 0) {
    ({ positions, zones } = structuredLayout(
      sortedNodes,
      sortedEdges,
      dimensions,
      spine,
    ));
  } else {
    // No Internet, gateway or core switch: fall back to the dagre hierarchy.
    positions = dagreLayout(sortedNodes, sortedEdges, dimensions, spine);
  }

  const nodes: FlowNode<FlowNodeData>[] = sortedNodes.map((node) => {
    const size = dimensions.get(node.id)!;
    return {
      ...node,
      position: positions.get(node.id)!,
      width: size.width,
      height: size.height,
    };
  });

  // Top-row edges run horizontally between the facing sides of the columns.
  const edges: TopologyFlowEdge[] = sortedEdges.map((edge) => {
    const sourceColumn = spine.memberColumn.get(edge.source);
    const targetColumn = spine.memberColumn.get(edge.target);

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
    zones,
    warnings: [...input.warnings],
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
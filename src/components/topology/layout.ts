
import dagre from '@dagrejs/dagre';
import type { Node as FlowNode } from '@xyflow/react';
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
 * - Fixed dimensions and layout configuration.
 * - No random values or time-dependent calculations.
 *
 * The cache is scoped by caller-provided plan identity and graph content.
 */

export const LAYOUT_CONFIG = {
  rankdir: 'TB',
  nodesep: 56,
  ranksep: 100,
  edgesep: 24,
  marginx: 40,
  marginy: 40,
  align: 'UL',
  ranker: 'network-simplex',
} as const;

const NODE_DIMENSIONS = {
  wan: { width: 180, height: 64 },
  gateway: { width: 200, height: 88 },
  firewall: { width: 180, height: 72 },
  controller: { width: 190, height: 76 },
  switch: { width: 200, height: 88 },
  access_point: { width: 180, height: 76 },
  client_group: { width: 190, height: 76 },
  default: { width: 180, height: 72 },
} as const;

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

function getNodeRank(node: TopologyFlowNode): number {
  const role = node.data.role;
  const layer = node.data.layer;

  if (role === 'wan') return 0;

  if (role === 'gateway' || role === 'firewall') return 1;

  if (role === 'controller') return 2;

  if (role === 'switch') {
    if (layer === 'core') return 2;
    if (layer === 'access') return 3;
    return 3;
  }

  if (role === 'access_point') return 4;

  if (role === 'client_group') return 5;

  return 6;
}

function getDimensions(node: TopologyFlowNode) {
  const role = node.data.role as keyof typeof NODE_DIMENSIONS;

  return NODE_DIMENSIONS[role] ?? NODE_DIMENSIONS.default;
}

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

  const dagreGraph = new dagre.graphlib.Graph({
    multigraph: true,
  });

  dagreGraph.setGraph({ ...LAYOUT_CONFIG });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

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

  for (const node of sortedNodes) {
    const dimensions = getDimensions(node);

    dagreGraph.setNode(node.id, {
      ...dimensions,
      rank: getNodeRank(node),
    });
  }

  // Invisible rank anchors enforce the intended top-to-bottom hierarchy,
  // including for nodes that have no connecting edges.
  const maxRank = Math.max(
    0,
    ...sortedNodes.map(getNodeRank),
  );

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

  for (const node of sortedNodes) {
    const rank = getNodeRank(node);

    dagreGraph.setEdge(
      anchorIds[rank],
      node.id,
      { weight: 100 },
    );

    dagreGraph.setEdge(
      node.id,
      anchorIds[rank + 1],
      { weight: 100 },
    );
  }

  // Preserve actual React Flow edges, but orient layout constraints
  // according to the intended visual hierarchy.
  for (const edge of sortedEdges) {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);

    if (!sourceNode || !targetNode) continue;

    const sourceRank = getNodeRank(sourceNode);
    const targetRank = getNodeRank(targetNode);

    const from =
      sourceRank <= targetRank ? edge.source : edge.target;

    const to =
      sourceRank <= targetRank ? edge.target : edge.source;

    dagreGraph.setEdge(
      from,
      to,
      { weight: 2 },
      edge.id,
    );
  }

  dagre.layout(dagreGraph);

  const nodes: FlowNode<FlowNodeData>[] = sortedNodes.map(
    (node) => {
      const positioned = dagreGraph.node(node.id);
      const dimensions = getDimensions(node);

      return {
        ...node,
        position: {
          x: positioned.x - dimensions.width / 2,
          y: positioned.y - dimensions.height / 2,
        },
        width: dimensions.width,
        height: dimensions.height,
      };
    },
  );

  const result: PositionedFlowGraph = {
    status: 'available',
    nodes,
    edges: sortedEdges,
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

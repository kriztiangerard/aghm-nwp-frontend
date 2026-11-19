import type { Edge, Node } from '@xyflow/react';


/**
 * ENGINE-016 topology role vocabulary:
 * wan (internet/WAN), gateway, firewall, controller,
 * switch, access_point, client_group.
 */
export type TopologyRole =
  | 'wan'
  | 'gateway'
  | 'firewall'
  | 'controller'
  | 'switch'
  | 'access_point'
  | 'client_group';

export type TopologyEdgeType =
  | 'wan'
  | 'uplink'
  | 'poe'
  | 'access'
  | 'management';

export type TopologyMedium =
  | 'logical'
  | 'copper'
  | 'fiber'
  | 'wireless';

/** Mirrors the node structure produced by ENGINE-016. */
export interface TopologyPlacement {
  floorId: string;
  floorLabel: string;
  closetId: string;
  closetLabel: string;
  qty: number;
}

export interface TopologyNode {
  id: string;
  role: string;
  layer: string;
  label: string;
  sku?: string;
  qty?: number;
  status?: 'ACTIVE' | 'SUNSETTING';
  integrates?: string[];
  integratedWith?: string;
  count?: number | null;
  clientKind?: string;
  placements?: TopologyPlacement[];
}

/** Mirrors the edge structure produced by ENGINE-016. */
export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  medium?: TopologyMedium;
  count?: number;
}

export interface TopologyPayload {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface TopologyWarning {
  code: string;
  message: string;
}

export interface FlowNodeData extends Record<string, unknown> {
  role: string;
  label: string;
  sku?: string;
  name?: string;
  qty?: number;
  status?: 'ACTIVE' | 'SUNSETTING';
  layer?: string;
  integrates?: string[];
  integratedWith?: string;
  count?: number | null;
  clientKind?: string;
  placements?: TopologyPlacement[];
  /**
   * TOPO-003 (floor grouping): the floor zone this node is drawn in.
   * Set by floor-grouping.ts only when the plan spans two or more floors.
   */
  floorId?: string;
  floorLabel?: string;
  /**
   * TOPO-003: for a per-floor AP or client node, the plan-wide total it was
   * split from (AP qty or client count).
   */
  planTotal?: number;
}

/**
 * TOPO-001 returns React Flow-compatible node data without positions.
 * TOPO-002 owns positioning and converts these into positioned nodes.
 */
export type TopologyFlowNode = Omit<Node<FlowNodeData>, 'position'>;

/**
 * TOPO-003: every topology edge renders through one custom edge component.
 * The payload's link type moves into `data.linkType`.
 */
export const TOPOLOGY_EDGE_TYPE = 'topology' as const;

export interface FlowEdgeData extends Record<string, unknown> {
  /** ENGINE-016 edge `type` as sent (wan, uplink, poe, access, management). */
  linkType: string;
  medium?: TopologyMedium;
  /** Number of device connections carried by this logical link. */
  count?: number;
  /** True for the gateway → firewall link (firewall built into the gateway). */
  integrated?: boolean;
  /**
   * True when source/target were swapped for drawing. Only the management
   * edge is swapped (payload: controller → gateway). It is drawn without an
   * arrowhead, so no direction is implied.
   */
  drawnReversed?: boolean;
}

export type TopologyFlowEdge = Edge<FlowEdgeData>;

export type FlowGraphResult =
  | {
      status: 'available';
      nodes: TopologyFlowNode[];
      edges: TopologyFlowEdge[];
      warnings: TopologyWarning[];
    }
  | {
      status: 'unavailable';
      reason: string;
      warnings: TopologyWarning[];
    };

export interface TopologyPlan {
  bom: {
    sku: string;
    name: string;
    category: string;
  }[];
  topology?: TopologyPayload | null;
}
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
}

/**
 * TOPO-001 returns React Flow-compatible node data without positions.
 * TOPO-002 owns positioning and converts these into positioned nodes.
 */
export type TopologyFlowNode = Omit<Node<FlowNodeData>, 'position'>;
export type TopologyFlowEdge = Edge;

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
import type { EdgeTypes, NodeTypes } from '@xyflow/react';

import { TopologyEdge } from './topology-edge';
import {
  AccessPointNode,
  ClientGroupNode,
  ControllerNode,
  FallbackNode,
  FirewallNode,
  FloorZoneNode,
  GatewayNode,
  SwitchNode,
  WanNode,
} from './topology-nodes';
import { TOPOLOGY_EDGE_TYPE } from './types';

/**
 * NWP-TOPO-003: React Flow node and edge registries.
 *
 * Kept in a .ts module so the .tsx files export only components
 * (react-refresh/only-export-components).
 */

/** Node type for the floor zone backgrounds built in topology-graph.tsx. */
export const FLOOR_ZONE_NODE_TYPE = 'floor_zone';

export const topologyNodeTypes: NodeTypes = {
  wan: WanNode,
  gateway: GatewayNode,
  firewall: FirewallNode,
  controller: ControllerNode,
  switch: SwitchNode,
  access_point: AccessPointNode,
  client_group: ClientGroupNode,
  [FLOOR_ZONE_NODE_TYPE]: FloorZoneNode,
  default: FallbackNode,
};

export const topologyEdgeTypes: EdgeTypes = {
  [TOPOLOGY_EDGE_TYPE]: TopologyEdge,
  default: TopologyEdge,
};
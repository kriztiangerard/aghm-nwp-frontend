import type { BomLine } from '@/types/api-types';
import {
  TOPOLOGY_EDGE_TYPE,
  type FlowGraphResult,
  type TopologyEdge,
  type TopologyEdgeType,
  type TopologyFlowEdge,
  type TopologyFlowNode,
  type TopologyNode,
  type TopologyPayload,
  type TopologyPlan,
  type TopologyRole,
  type TopologyWarning,
} from './types';

const KNOWN_ROLES = new Set<TopologyRole>([
  'wan',
  'gateway',
  'firewall',
  'controller',
  'switch',
  'access_point',
  'client_group',
]);

const KNOWN_EDGE_TYPES = new Set<TopologyEdgeType>([
  'wan',
  'uplink',
  'poe',
  'access',
  'management',
]);

const BOM_CATEGORY_BY_ROLE: Partial<
  Record<TopologyRole, BomLine['category']>
> = {
  gateway: 'gateway',
  controller: 'controller',
  switch: 'switch',
  access_point: 'access_point',
};

/**
 * Converts ENGINE-016's logical topology into a position-independent
 * React Flow graph. TOPO-002 is responsible for adding node positions.
 *
 * TOPO-003 additions:
 * - An integrated node (the firewall) takes the product name and lifecycle
 *   status of its host gateway, because it is the same SKU.
 * - Every edge uses the single `topology` edge type; the payload link type
 *   is kept in `data.linkType`.
 * - The gateway → firewall edge is marked `integrated`.
 * - The management edge (controller → gateway in the payload) is drawn from
 *   the gateway down to the controller, without an arrowhead.
 *
 * Only whitelisted fields are copied into node data, so no IP address,
 * VLAN, port mapping or rack position can reach the canvas (TOPO-003 AC9).
 */
export function toFlowGraph(plan: TopologyPlan): FlowGraphResult {
  const rawTopology = plan.topology as
    | Partial<TopologyPayload>
    | null
    | undefined;

  if (
    !rawTopology ||
    !Array.isArray(rawTopology.nodes) ||
    !Array.isArray(rawTopology.edges)
  ) {
    return {
      status: 'unavailable',
      reason: 'Topology data is unavailable for this plan.',
      warnings: [],
    };
  }

  const topology = rawTopology as TopologyPayload;
  const warnings: TopologyWarning[] = [];

  const nodes: TopologyFlowNode[] = topology.nodes.map(
    (node: TopologyNode) => {
      const isKnownRole = KNOWN_ROLES.has(node.role as TopologyRole);

      if (!isKnownRole) {
        warnings.push({
          code: 'UNKNOWN_NODE_ROLE',
          message: `Node "${node.id}" has unknown role "${node.role}".`,
        });
      }

      const bomCategory = BOM_CATEGORY_BY_ROLE[
        node.role as TopologyRole
      ];

      const bomLine =
        bomCategory && node.sku
          ? plan.bom.find(
              (line) =>
                line.category === bomCategory && line.sku === node.sku,
            )
          : undefined;

      if (bomCategory && !bomLine) {
        warnings.push({
          code: 'BOM_LINE_NOT_FOUND',
          message: `No matching BOM line found for node "${node.id}" (category: ${bomCategory}, SKU: ${node.sku ?? 'missing'}).`,
        });
      }

      return {
        id: node.id,
        type: isKnownRole ? node.role : 'default',
        data: {
          role: node.role,
          label: node.label,
          ...(node.sku !== undefined ? { sku: node.sku } : {}),
          ...(bomLine ? { name: bomLine.name } : {}),
          ...(node.qty !== undefined ? { qty: node.qty } : {}),
          ...(node.status !== undefined ? { status: node.status } : {}),
          ...(node.layer !== undefined ? { layer: node.layer } : {}),
          ...(node.integrates !== undefined
            ? { integrates: [...node.integrates] }
            : {}),
          ...(node.integratedWith !== undefined
            ? { integratedWith: node.integratedWith }
            : {}),
          ...(node.count !== undefined ? { count: node.count } : {}),
          ...(node.clientKind !== undefined
            ? { clientKind: node.clientKind }
            : {}),
          ...(node.placements !== undefined
            ? {
                placements: node.placements.map((placement) => ({
                  ...placement,
                })),
              }
            : {}),
        },
      };
    },
  );

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  // TOPO-003 AC2 / AC8: the logical firewall is the gateway SKU, so it shows
  // the same product name and lifecycle status as its host.
  for (const node of nodes) {
    const hostId = node.data.integratedWith;
    if (!hostId) continue;

    const host = nodeById.get(hostId);

    if (!host) {
      warnings.push({
        code: 'INTEGRATED_HOST_MISSING',
        message: `Node "${node.id}" is integrated with "${hostId}", which does not exist.`,
      });
      continue;
    }

    if (node.data.name === undefined && host.data.name !== undefined) {
      node.data.name = host.data.name;
    }

    if (node.data.status === undefined && host.data.status !== undefined) {
      node.data.status = host.data.status;
    }
  }

  // TOPO-003 AC10: ENGINE-016 sends one grouped AP node per plan.
  const apNodeCount = nodes.filter(
    (node) => node.data.role === 'access_point',
  ).length;

  if (apNodeCount > 1) {
    warnings.push({
      code: 'MULTIPLE_AP_NODES',
      message: `Expected one grouped access point node but found ${apNodeCount}.`,
    });
  }

  const edges: TopologyFlowEdge[] = topology.edges.flatMap(
    (edge: TopologyEdge) => {
      const missingEndpoints = [
        ...(!nodeById.has(edge.source) ? [edge.source] : []),
        ...(!nodeById.has(edge.target) ? [edge.target] : []),
      ];

      if (missingEndpoints.length > 0) {
        warnings.push({
          code: 'EDGE_ENDPOINT_MISSING',
          message: `Edge "${edge.id}" was dropped because endpoint(s) ${missingEndpoints.map((id) => `"${id}"`).join(', ')} do not exist.`,
        });
        return [];
      }

      if (!KNOWN_EDGE_TYPES.has(edge.type as TopologyEdgeType)) {
        warnings.push({
          code: 'UNKNOWN_EDGE_TYPE',
          message: `Edge "${edge.id}" has unknown link type "${edge.type}".`,
        });
      }

      const target = nodeById.get(edge.target);
      const integrated =
        target?.data.role === 'firewall' &&
        target.data.integratedWith === edge.source;

      const drawnReversed = edge.type === 'management';

      const flowEdge: TopologyFlowEdge = {
        id: edge.id,
        source: drawnReversed ? edge.target : edge.source,
        target: drawnReversed ? edge.source : edge.target,
        type: TOPOLOGY_EDGE_TYPE,
        data: {
          linkType: edge.type,
          ...(edge.medium !== undefined ? { medium: edge.medium } : {}),
          ...(edge.count !== undefined ? { count: edge.count } : {}),
          ...(integrated ? { integrated: true } : {}),
          ...(drawnReversed ? { drawnReversed: true } : {}),
        },
      };

      return [flowEdge];
    },
  );

  return {
    status: 'available',
    nodes,
    edges,
    warnings,
  };
}

import type { BomLine } from '@/types/api-types';
import type {
  FlowGraphResult,
  TopologyEdge,
  TopologyFlowEdge,
  TopologyFlowNode,
  TopologyNode,
  TopologyPayload,
  TopologyPlan,
  TopologyRole,
  TopologyWarning,
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
            ? { integrates: node.integrates }
            : {}),
          ...(node.integratedWith !== undefined
            ? { integratedWith: node.integratedWith }
            : {}),
          ...(node.count !== undefined ? { count: node.count } : {}),
          ...(node.clientKind !== undefined
            ? { clientKind: node.clientKind }
            : {}),
        },
      };
    },
  );

  const nodeIds = new Set(nodes.map((node) => node.id));

  const edges: TopologyFlowEdge[] = topology.edges.flatMap(
    (edge: TopologyEdge) => {
      const missingEndpoints = [
        ...(!nodeIds.has(edge.source) ? [edge.source] : []),
        ...(!nodeIds.has(edge.target) ? [edge.target] : []),
      ];

      if (missingEndpoints.length > 0) {
        warnings.push({
          code: 'EDGE_ENDPOINT_MISSING',
          message: `Edge "${edge.id}" was dropped because endpoint(s) ${missingEndpoints.map((id) => `"${id}"`).join(', ')} do not exist.`,
        });
        return [];
      }

      return [
        {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          data: {
            ...(edge.medium !== undefined ? { medium: edge.medium } : {}),
            ...(edge.count !== undefined ? { count: edge.count } : {}),
          },
        },
      ];
    },
  );

  return {
    status: 'available',
    nodes,
    edges,
    warnings,
  };
}

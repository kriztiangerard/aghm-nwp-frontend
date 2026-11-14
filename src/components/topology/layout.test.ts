import { describe, expect, it } from 'vitest';
import {
  clearLayoutCache,
  layoutGraph,
} from './layout';
import type {
  TopologyFlowEdge,
  TopologyFlowNode,
} from './types';

function makeNode(
  id: string,
  role: string,
  layer: string,
): TopologyFlowNode {
  return {
    id,
    type: 'default',
    data: {
      role,
      label: id,
      layer,
    },
  };
}

function makeEdge(
  id: string,
  source: string,
  target: string,
): TopologyFlowEdge {
  return {
    id,
    source,
    target,
    type: 'default',
  };
}

function makeGraph() {
  const nodes = [
    makeNode('wan-1', 'wan', 'wan'),
    makeNode('gateway-1', 'gateway', 'gateway'),
    makeNode('firewall-1', 'firewall', 'gateway'),
    makeNode('core-1', 'switch', 'core'),
    makeNode('controller-1', 'controller', 'management'),
    makeNode('access-1', 'switch', 'access'),
    makeNode('ap-1', 'access_point', 'edge'),
    makeNode('clients-1', 'client_group', 'edge'),
  ];

  const edges = [
    makeEdge('e1', 'wan-1', 'gateway-1'),
    makeEdge('e2', 'gateway-1', 'firewall-1'),
    makeEdge('e3', 'gateway-1', 'core-1'),
    makeEdge('e4', 'core-1', 'access-1'),
    makeEdge('e5', 'access-1', 'ap-1'),
    makeEdge('e6', 'ap-1', 'clients-1'),
  ];

  return {
    nodes,
    edges,
    warnings: [],
  };
}

function centerY(node: {
  position: { x: number; y: number };
  height?: number;
}) {
  return node.position.y + (node.height ?? 0) / 2;
}

describe('TOPO-002 deterministic topology layout', () => {
  it('AC1: assigns finite coordinates and prevents node overlap', () => {
    const result = layoutGraph(makeGraph());

    expect(result.status).toBe('available');
    expect(result.nodes).toHaveLength(8);

    for (const node of result.nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
      expect(node.width).toBeGreaterThan(0);
      expect(node.height).toBeGreaterThan(0);
    }

    const overlaps: string[] = [];

    for (let i = 0; i < result.nodes.length; i += 1) {
      for (let j = i + 1; j < result.nodes.length; j += 1) {
        const a = result.nodes[i];
        const b = result.nodes[j];

        const overlap =
          a.position.x < b.position.x + (b.width ?? 0) &&
          a.position.x + (a.width ?? 0) > b.position.x &&
          a.position.y < b.position.y + (b.height ?? 0) &&
          a.position.y + (a.height ?? 0) > b.position.y;

        if (overlap) {
          overlaps.push(`${a.id} overlaps ${b.id}`);
        }
      }
    }

    expect(overlaps).toEqual([]);
  });

  it('AC2: produces identical coordinates for repeated layouts', () => {
    const graph = makeGraph();

    const first = layoutGraph(graph);
    const second = layoutGraph(graph);

    const getCoordinates = (nodes: typeof first.nodes) =>
      nodes.map((node) => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
      }));

    expect(getCoordinates(second.nodes)).toEqual(
      getCoordinates(first.nodes),
    );
  });

  it('AC2: produces identical coordinates when input order changes', () => {
    const graph = makeGraph();

    const first = layoutGraph(graph);

    const reversed = {
      ...graph,
      nodes: [...graph.nodes].reverse(),
      edges: [...graph.edges].reverse(),
    };

    const second = layoutGraph(reversed);

    const getCoordinates = (nodes: typeof first.nodes) =>
      nodes.map((node) => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
      }));

    expect(getCoordinates(second.nodes)).toEqual(
      getCoordinates(first.nodes),
    );
  });

  it('AC3: places topology roles in the required top-to-bottom hierarchy', () => {
    const result = layoutGraph(makeGraph());

    const getNode = (id: string) => {
      const node = result.nodes.find((item) => item.id === id);

      if (!node) {
        throw new Error(`Missing test node: ${id}`);
      }

      return node;
    };

    expect(centerY(getNode('wan-1'))).toBeLessThan(
      centerY(getNode('gateway-1')),
    );

    expect(centerY(getNode('wan-1'))).toBeLessThan(
      centerY(getNode('firewall-1')),
    );

    expect(centerY(getNode('gateway-1'))).toBeLessThan(
      centerY(getNode('access-1')),
    );

    expect(centerY(getNode('core-1'))).toBeLessThan(
      centerY(getNode('access-1')),
    );

    expect(centerY(getNode('access-1'))).toBeLessThan(
      centerY(getNode('ap-1')),
    );

    expect(centerY(getNode('ap-1'))).toBeLessThan(
      centerY(getNode('clients-1')),
    );
  });

  it('AC3: maintains hierarchy when only a gateway is present', () => {
    const graph = makeGraph();

    const gatewayOnlyGraph = {
      ...graph,
      nodes: graph.nodes.filter((node) => node.id !== 'firewall-1'),
      edges: graph.edges.filter(
        (edge) =>
          edge.source !== 'firewall-1' &&
          edge.target !== 'firewall-1',
      ),
    };

    const result = layoutGraph(gatewayOnlyGraph);

    const getNode = (id: string) => {
      const node = result.nodes.find((item) => item.id === id);

      if (!node) {
        throw new Error(`Missing test node: ${id}`);
      }

      return node;
    };

    expect(
      result.nodes.some((node) => node.data.role === 'firewall'),
    ).toBe(false);

    expect(centerY(getNode('wan-1'))).toBeLessThan(
      centerY(getNode('gateway-1')),
    );

    expect(centerY(getNode('gateway-1'))).toBeLessThan(
      centerY(getNode('core-1')),
    );

    expect(centerY(getNode('core-1'))).toBeLessThan(
      centerY(getNode('access-1')),
    );
  });

  it('preserves the original graph edges', () => {
    const graph = makeGraph();
    const result = layoutGraph(graph);

    expect(result.edges).toHaveLength(graph.edges.length);

    expect(result.edges.map((edge) => edge.id).sort()).toEqual(
      graph.edges.map((edge) => edge.id).sort(),
    );
  });

  it('returns independent results when the layout cache is used', () => {
    clearLayoutCache();

    const first = layoutGraph(makeGraph(), 'test-plan');
    first.nodes[0].position.x = -999;

    const second = layoutGraph(makeGraph(), 'test-plan');

    expect(second.nodes[0].position.x).not.toBe(-999);

    clearLayoutCache();
  });
});

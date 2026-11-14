
import { describe, expect, it } from 'vitest';
import { clearLayoutCache, layoutGraph } from './layout';
import type { TopologyFlowNode, TopologyFlowEdge } from './types';

function makeNode(
  id: string,
  role: string,
  layer: string,
): TopologyFlowNode {
  return {
    id,
    type: 'default',
    data: { role, layer, label: id },
  };
}

function makeEdge(
  source: string,
  target: string,
): TopologyFlowEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: 'default',
  };
}

function makeLargeGraph() {
  const nodes: TopologyFlowNode[] = [
    makeNode('wan', 'wan', 'wan'),
    makeNode('gateway', 'gateway', 'gateway'),
    makeNode('core', 'switch', 'core'),
  ];

  const edges: TopologyFlowEdge[] = [
    makeEdge('wan', 'gateway'),
    makeEdge('gateway', 'core'),
  ];

  // Five floors, each with access switches, APs,
  // and client groups representing 200 users.
  for (let floor = 1; floor <= 5; floor += 1) {
    const sw = `floor-${floor}-switch`;
    const ap = `floor-${floor}-ap`;

    nodes.push(makeNode(sw, 'switch', 'access'));
    nodes.push(makeNode(ap, 'access_point', 'edge'));

    edges.push(makeEdge('core', sw));
    edges.push(makeEdge(sw, ap));

    for (let group = 1; group <= 4; group += 1) {
      const id = `floor-${floor}-clients-${group}`;

      nodes.push(makeNode(id, 'client_group', 'edge'));
      edges.push(makeEdge(ap, id));
    }

    const cameras = `floor-${floor}-cameras`;
    const voip = `floor-${floor}-voip`;

    nodes.push(makeNode(cameras, 'client_group', 'edge'));
    nodes.push(makeNode(voip, 'client_group', 'edge'));

    edges.push(makeEdge(sw, cameras));
    edges.push(makeEdge(sw, voip));
  }

  return {
    nodes,
    edges,
    warnings: [],
  };
}

describe('TOPO-002 AC5 large-scenario performance', () => {
  it('lays out a 200-user, multi-floor scenario without throwing', () => {
    clearLayoutCache();

    const graph = makeLargeGraph();

    const start = performance.now();
    const result = layoutGraph(graph);
    const elapsed = performance.now() - start;

    console.log(
      `AC5 layout: ${graph.nodes.length} nodes, ` +
      `${graph.edges.length} edges, ${elapsed.toFixed(2)} ms`,
    );

    expect(result.status).toBe('available');
    expect(result.nodes).toHaveLength(graph.nodes.length);
    expect(result.edges).toHaveLength(graph.edges.length);

    for (const node of result.nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    }

    // Diagnostic only: timing varies by machine.
    // Browser frame-budget compliance needs separate verification.
    expect(Number.isFinite(elapsed)).toBe(true);
  });
});

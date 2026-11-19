import type { PositionedFlowGraph } from "./layout";

export interface TopologyExportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function getTopologyExportBounds(
  graph: PositionedFlowGraph,
  padding = 40,
): TopologyExportBounds {
  if (graph.nodes.length === 0) {
    throw new Error("Cannot calculate bounds for an empty topology");
  }

  if (!Number.isFinite(padding) || padding < 0) {
    throw new Error("Padding must be a non-negative finite number");
  }

  const bounds = graph.nodes.reduce(
    (result, node) => {
      const { x, y } = node.position;
      const width = node.width ?? 0;
      const height = node.height ?? 0;

      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
      ) {
        throw new Error(`Invalid dimensions or position for node: ${node.id}`);
      }

      return {
        minX: Math.min(result.minX, x),
        minY: Math.min(result.minY, y),
        maxX: Math.max(result.maxX, x + width),
        maxY: Math.max(result.maxY, y + height),
      };
    },
    {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    },
  );

  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
    width: bounds.maxX - bounds.minX + padding * 2,
    height: bounds.maxY - bounds.minY + padding * 2,
  };
}
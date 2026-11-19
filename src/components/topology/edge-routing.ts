/**
 * NWP-TOPO-003: ids of the left/right side handles on the spine nodes
 * (Internet/WAN, gateway, core switch).
 *
 * layout.ts assigns these to the horizontal spine edges
 * (WAN → gateway → core), and topology-nodes.tsx renders the matching
 * handles. Every other edge uses the default top/bottom handles.
 */
export const SIDE_HANDLES = {
  sourceLeft: 'side-source-left',
  sourceRight: 'side-source-right',
  targetLeft: 'side-target-left',
  targetRight: 'side-target-right',
} as const;
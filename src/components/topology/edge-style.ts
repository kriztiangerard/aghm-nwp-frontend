import type { FlowEdgeData } from './types';

/**
 * NWP-TOPO-003: edge style variants.
 *
 * The edge component and the legend both read this table, so the legend
 * always shows exactly how an edge is drawn. No variant relies on colour
 * alone: each also has its own width or dash pattern.
 */
export type EdgeVariant = 'copper' | 'fiber' | 'poe' | 'wireless' | 'logical';

/** Legend order. */
export const EDGE_VARIANTS: readonly EdgeVariant[] = [
  'copper',
  'fiber',
  'poe',
  'wireless',
  'logical',
];

export interface EdgeVariantStyle {
  stroke: string;
  strokeWidth: number;
  dasharray?: string;
  linecap?: 'butt' | 'round' | 'square';
  /** Drawn as a thick tube with a thin background-coloured core (fiber). */
  cased?: boolean;
  legendLabel: string;
  legendDescription: string;
}

export const EDGE_VARIANT_STYLES: Record<EdgeVariant, EdgeVariantStyle> = {
  copper: {
    stroke: 'var(--topo-edge-copper)',
    strokeWidth: 1.5,
    legendLabel: 'Copper link',
    legendDescription: 'Ethernet cable: switch uplinks and wired devices.',
  },
  fiber: {
    stroke: 'var(--topo-edge-fiber)',
    strokeWidth: 4.5,
    cased: true,
    legendLabel: 'Fiber backbone',
    legendDescription:
      'Fiber link between the core and access switches.',
  },
  poe: {
    stroke: 'var(--topo-edge-poe)',
    strokeWidth: 1.75,
    dasharray: '7 4',
    legendLabel: 'PoE',
    legendDescription:
      'Copper link that also powers the device (access points, VoIP phones, cameras).',
  },
  wireless: {
    stroke: 'var(--topo-edge-wireless)',
    strokeWidth: 2,
    dasharray: '0.5 5',
    linecap: 'round',
    legendLabel: 'Wi-Fi',
    legendDescription: 'Wireless devices connecting through the access points.',
  },
  logical: {
    stroke: 'var(--topo-edge-logical)',
    strokeWidth: 1.5,
    dasharray: '3 3',
    legendLabel: 'Logical link',
    legendDescription:
      'Not a separate cable: this just represents links between the internet service, the built-in firewall, or controller management.',
  },
};

export function resolveEdgeVariant(data?: FlowEdgeData): EdgeVariant {
  if (!data) return 'copper';
  if (data.medium === 'fiber') return 'fiber';
  if (data.medium === 'wireless') return 'wireless';
  if (data.medium === 'logical') return 'logical';
  if (data.linkType === 'poe') return 'poe';
  return 'copper';
}

const LINK_TYPE_LABELS: Record<string, string> = {
  wan: 'WAN',
  uplink: 'Uplink',
  poe: 'PoE',
  access: 'Access',
  management: 'Management',
};

function humanize(value: string): string {
  const text = value.replace(/[_-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Visible edge label, built from the payload link type, medium and count (AC6). */
export function describeEdge(data?: FlowEdgeData): string | null {
  if (!data?.linkType) return null;

  let base: string;

  if (data.integrated) {
    base = 'Built-in';
  } else if (data.linkType === 'uplink' && data.medium === 'fiber') {
    base = 'Fiber backbone';
  } else if (data.linkType === 'access' && data.medium === 'wireless') {
    base = 'Wi-Fi';
  } else {
    base = LINK_TYPE_LABELS[data.linkType] ?? humanize(data.linkType);
  }

  return typeof data.count === 'number' && data.count > 0
    ? `${base} ×${data.count}`
    : base;
}

/**
 * Data-path edges point from the internet inward. Management carries control
 * traffic, not the data path, so it is drawn without an arrowhead.
 */
export function showsDirection(data?: FlowEdgeData): boolean {
  return data?.linkType !== 'management';
}
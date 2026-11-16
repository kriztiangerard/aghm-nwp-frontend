import {
  Boxes,
  Cctv,
  CircleHelp,
  Globe,
  Monitor,
  Network,
  Phone,
  Router,
  Server,
  Shield,
  Smartphone,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import type { FlowNodeData } from './types';

/**
 * NWP-TOPO-003: display text, icons and theme accents for each node role.
 * Reads only role, product, quantity, count and status fields (AC9).
 */

const ROLE_ICONS: Record<string, LucideIcon> = {
  wan: Globe,
  gateway: Router,
  firewall: Shield,
  controller: Server,
  switch: Network,
  access_point: Wifi,
  client_group: Monitor,
};

const CLIENT_ICONS: Record<string, LucideIcon> = {
  wired_pcs: Monitor,
  wifi_devices: Smartphone,
  voip_phones: Phone,
  cameras: Cctv,
  other_devices: Boxes,
};

/** Token stem in topology-theme.css (--topo-node-<stem>-bg / -fg). */
const ROLE_TOKEN: Record<string, string> = {
  wan: 'wan',
  gateway: 'gateway',
  firewall: 'firewall',
  controller: 'controller',
  switch: 'switch',
  access_point: 'access-point',
  client_group: 'client',
};

export interface RoleColors {
  /** Card fill. */
  bg: string;
  /** Text and icon-tile colour on that fill. */
  fg: string;
}

function humanize(value: string): string {
  const text = value.replace(/[_-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function roleIcon(role: string): LucideIcon {
  return ROLE_ICONS[role] ?? CircleHelp;
}

export function clientIcon(clientKind?: string): LucideIcon {
  return (clientKind && CLIENT_ICONS[clientKind]) || Monitor;
}

export function roleColors(role: string): RoleColors {
  const stem = ROLE_TOKEN[role] ?? 'default';
  return {
    bg: `var(--topo-node-${stem}-bg)`,
    fg: `var(--topo-node-${stem}-fg)`,
  };
}

export function roleText(data: FlowNodeData): string {
  switch (data.role) {
    case 'wan':
      return 'Internet / WAN';
    case 'gateway':
      return 'Gateway';
    case 'firewall':
      return 'Firewall';
    case 'controller':
      return 'Controller';
    case 'switch':
      if (data.layer === 'core') return 'Core switch';
      if (data.layer === 'access') return 'Access switch';
      return 'Switch';
    case 'access_point':
      return 'Access points';
    case 'client_group':
      return 'Client group';
    default:
      return humanize(data.role || 'Device');
  }
}

/** BOM product name when the adapter found one, otherwise the engine label. */
export function productName(data: FlowNodeData): string {
  return data.name ?? data.label;
}

export function clientCountText(count: number | null | undefined): string {
  if (typeof count !== 'number') return 'Count not specified';
  return `${count} ${count === 1 ? 'device' : 'devices'}`;
}

const INTEGRATED_LABELS: Record<string, string> = {
  firewall: 'firewall',
  controller: 'controller',
};

/** Screen-reader summary of a node. */
export function nodeA11yLabel(data: FlowNodeData): string {
  const parts: string[] = [roleText(data)];

  if (data.role === 'client_group') {
    parts.push(data.label, clientCountText(data.count));
  } else if (data.role === 'wan') {
    parts.push(data.label);
  } else {
    parts.push(productName(data));
    if (data.sku) parts.push(`SKU ${data.sku}`);
    if (typeof data.qty === 'number') parts.push(`quantity ${data.qty}`);
  }

  for (const fn of data.integrates ?? []) {
    parts.push(`integrated ${INTEGRATED_LABELS[fn] ?? fn}`);
  }
  if (data.integratedWith) parts.push('integrated in the gateway');
  if (data.status === 'SUNSETTING') {
    parts.push('sunsetting, confirm availability');
  }

  return parts.join(', ');
}

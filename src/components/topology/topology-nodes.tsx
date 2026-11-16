import type { CSSProperties, ReactNode } from "react";
import {
  Handle,
  Position,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SIDE_HANDLES } from "./edge-routing";
import {
  accessPointDetail,
  clientCountText,
  clientIcon,
  nodeA11yLabel,
  productName,
  roleColors,
  roleIcon,
  roleText,
  type RoleColors,
} from "./node-display";
import {
  IntegratedFunctionBadge,
  IntegratedWithBadge,
  SunsettingBadge,
} from "./topology-badges";
import type { FlowNodeData } from "./types";

/**
 * NWP-TOPO-003: custom React Flow node components, one per role, built on
 * shadcn Card and Badge.
 *
 * Icon-first cards, in the style of a network diagram: a large device symbol
 * (from the lucide set) sits at the top of each card, with the role, model
 * name and SKU centred underneath. The card is filled with its role colour
 * (--topo-node-<role>-bg). Text uses the matching contrast colour (-fg). The
 * icon tile swaps the pair, so the symbol is the most prominent mark.
 *
 * All card text goes through <CardText>, which explicitly inherits the card
 * colour, so global <p> styles cannot recolour it.
 *
 * Nodes show only role, product name, SKU, quantity or count, and badges.
 * No IP addressing, VLAN IDs, port mappings or rack positions are read or
 * rendered (AC9). Card sizes are computed in layout.ts (getNodeDimensions).
 * Keep CARD_METRICS there in step with the classes here.
 */

type TopologyNodeProps = NodeProps<Node<FlowNodeData>>;

// ---- Handles -------------------------------------------------------------
// The default top/bottom handles come first in the DOM, so edges without an
// explicit handle id attach to them.

function TargetTop() {
  return (
    <Handle
      type="target"
      position={Position.Top}
      isConnectable={false}
      className="topology-handle"
    />
  );
}

function SourceBottom() {
  return (
    <Handle
      type="source"
      position={Position.Bottom}
      isConnectable={false}
      className="topology-handle"
    />
  );
}

/** Side handles for the horizontal top row (Internet → gateway → core switch). */
function SpineHandles() {
  return (
    <>
      <Handle
        id={SIDE_HANDLES.targetLeft}
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="topology-handle"
      />
      <Handle
        id={SIDE_HANDLES.sourceRight}
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="topology-handle"
      />
      <Handle
        id={SIDE_HANDLES.sourceLeft}
        type="source"
        position={Position.Left}
        isConnectable={false}
        className="topology-handle"
      />
      <Handle
        id={SIDE_HANDLES.targetRight}
        type="target"
        position={Position.Right}
        isConnectable={false}
        className="topology-handle"
      />
    </>
  );
}

// ---- Shared pieces -----------------------------------------------------------

const INHERIT_COLOR: CSSProperties = { color: "inherit" };

/** Card text that always takes the card's contrast colour. */
function CardText({
  className,
  title,
  children,
}: {
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn("block max-w-full", className)}
      style={INHERIT_COLOR}
      title={title}
    >
      {children}
    </span>
  );
}

/**
 * Filled card colours. The border mixes in the text colour, so light fills
 * (clients, access points) keep a visible edge on a light page.
 * Text on cards is never faded with opacity, which would lower the contrast
 * ratios documented in topology-theme.css.
 */
function cardStyle(colors: RoleColors): CSSProperties {
  return {
    backgroundColor: colors.bg,
    color: colors.fg,
    borderColor: `color-mix(in oklch, ${colors.fg} 35%, ${colors.bg})`,
  };
}

/** Large inverted symbol tile: 48 px tile, 28 px icon. */
function IconTile({
  icon: Icon,
  colors,
  rounded = "rounded-xl",
}: {
  icon: LucideIcon;
  colors: RoleColors;
  rounded?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center shadow-sm",
        rounded,
      )}
      style={{ backgroundColor: colors.fg, color: colors.bg }}
      aria-hidden="true"
    >
      <Icon className="size-7" strokeWidth={2} />
    </span>
  );
}

const ROLE_TEXT_CLASS =
  "truncate text-[10px] font-bold uppercase leading-[15px] tracking-wide";
const NAME_CLASS = "truncate text-xs font-semibold leading-[15px]";
const MINOR_CLASS = "truncate text-[10px] leading-[15px]";

interface DeviceNodeCardProps {
  data: FlowNodeData;
  icon?: LucideIcon;
  quantityText?: string;
  detail?: string;
  badges?: ReactNode;
}

function DeviceNodeCard({
  data,
  icon,
  quantityText,
  detail,
  badges,
}: DeviceNodeCardProps) {
  const colors = roleColors(data.role);
  const name = productName(data);

  return (
    <Card
      role="group"
      aria-label={nodeA11yLabel(data)}
      className="relative h-full w-full gap-0 overflow-hidden rounded-xl border py-0 shadow-md"
      style={cardStyle(colors)}
      data-testid={`topology-node-${data.role}`}
    >
      {quantityText && (
        <span
          className="absolute right-2 top-2 rounded-sm px-1.5 text-[11px] font-bold leading-4 tabular-nums"
          style={{ backgroundColor: colors.fg, color: colors.bg }}
        >
          {quantityText}
        </span>
      )}

      <div className="flex h-full min-w-0 flex-col items-center gap-1.5 px-3 py-3 text-center">
        <IconTile icon={icon ?? roleIcon(data.role)} colors={colors} />

        <div className="w-full min-w-0">
          <CardText className={ROLE_TEXT_CLASS}>{roleText(data)}</CardText>
          <CardText className={NAME_CLASS} title={name}>
            {name}
          </CardText>
          {data.sku && (
            <CardText className={cn(MINOR_CLASS, "font-mono")} title={data.sku}>
              SKU {data.sku}
            </CardText>
          )}
        </div>

        {detail && <CardText className={MINOR_CLASS}>{detail}</CardText>}

        {badges && (
          <div className="flex w-full flex-wrap justify-center gap-1">
            {badges}
          </div>
        )}
      </div>
    </Card>
  );
}

const quantityIfMany = (qty?: number) =>
  typeof qty === "number" && qty > 1 ? `×${qty}` : undefined;

const sunsetting = (data: FlowNodeData) =>
  data.status === "SUNSETTING" ? <SunsettingBadge /> : undefined;

/** Compact icon-first card for the internet and client groups. */
function CompactCard({
  data,
  icon,
  colors,
  title,
  subtitle,
  rounded,
}: {
  data: FlowNodeData;
  icon: LucideIcon;
  colors: RoleColors;
  title: string;
  subtitle: string;
  rounded?: string;
}) {
  return (
    <Card
      role="group"
      aria-label={nodeA11yLabel(data)}
      className="h-full w-full items-center justify-center gap-1.5 overflow-hidden rounded-xl border px-3 py-3 text-center shadow-md"
      style={cardStyle(colors)}
      data-testid={`topology-node-${data.role}`}
    >
      <IconTile icon={icon} colors={colors} rounded={rounded} />
      <div className="w-full min-w-0">
        <CardText className={NAME_CLASS} title={title}>
          {title}
        </CardText>
        <CardText className="truncate text-[11px] leading-[15px] tabular-nums">
          {subtitle}
        </CardText>
      </div>
    </Card>
  );
}

// ---- Role components -------------------------------------------------------

function WanNode({ data }: TopologyNodeProps) {
  return (
    <>
      <CompactCard
        data={data}
        icon={roleIcon("wan")}
        colors={roleColors("wan")}
        title={data.label}
        subtitle="Internet service"
        rounded="rounded-full"
      />
      <SourceBottom />
      <SpineHandles />
    </>
  );
}

function GatewayNode({ data }: TopologyNodeProps) {
  const integrates = data.integrates ?? [];

  return (
    <>
      <TargetTop />
      <DeviceNodeCard
        data={data}
        quantityText={quantityIfMany(data.qty)}
        badges={
          integrates.length > 0 || data.status === "SUNSETTING" ? (
            <>
              {integrates.map((fn) => (
                <IntegratedFunctionBadge key={fn} fn={fn} />
              ))}
              {sunsetting(data)}
            </>
          ) : undefined
        }
      />
      <SourceBottom />
      <SpineHandles />
    </>
  );
}

/** Linked to the gateway by the dashed "Built-in" logical edge (AC2). */
function FirewallNode({ data }: TopologyNodeProps) {
  return (
    <>
      <TargetTop />
      <DeviceNodeCard
        data={data}
        detail="Firewall function of the gateway"
        badges={
          data.integratedWith || data.status === "SUNSETTING" ? (
            <>
              {data.integratedWith && <IntegratedWithBadge />}
              {sunsetting(data)}
            </>
          ) : undefined
        }
      />
    </>
  );
}

function ControllerNode({ data }: TopologyNodeProps) {
  return (
    <>
      <TargetTop />
      <DeviceNodeCard
        data={data}
        quantityText={quantityIfMany(data.qty)}
        badges={sunsetting(data)}
      />
    </>
  );
}

function SwitchNode({ data }: TopologyNodeProps) {
  return (
    <>
      <TargetTop />
      <DeviceNodeCard
        data={data}
        quantityText={quantityIfMany(data.qty)}
        badges={sunsetting(data)}
      />
      <SourceBottom />
      {data.layer === "core" && <SpineHandles />}
    </>
  );
}

/**
 * Revised AC10: one grouped node per floor, with that floor's AP count, its
 * share of the plan total, and the plan's single AP model. In a single-floor
 * plan this is the one plan-wide node.
 */
function AccessPointNode({ data }: TopologyNodeProps) {
  return (
    <>
      <TargetTop />
      <DeviceNodeCard
        data={data}
        quantityText={typeof data.qty === "number" ? `×${data.qty}` : undefined}
        detail={accessPointDetail(data)}
        badges={sunsetting(data)}
      />
      <SourceBottom />
    </>
  );
}

/** AC5: grouped client node with a count (per floor when the plan has floors). */
function ClientGroupNode({ data }: TopologyNodeProps) {
  return (
    <>
      <TargetTop />
      <CompactCard
        data={data}
        icon={clientIcon(data.clientKind)}
        colors={roleColors("client_group")}
        title={data.label}
        subtitle={clientCountText(data.count)}
      />
    </>
  );
}

/** Unknown roles: the adapter already raised UNKNOWN_NODE_ROLE. */
function FallbackNode({ data }: TopologyNodeProps) {
  return (
    <>
      <TargetTop />
      <DeviceNodeCard
        data={data}
        quantityText={quantityIfMany(data.qty)}
        badges={sunsetting(data)}
      />
      <SourceBottom />
    </>
  );
}

/**
 * Floor zone: a dashed, lightly tinted area behind one floor's devices.
 * Built in topology-graph.tsx from layout zones. It is not a topology device
 * and is drawn below the edges (zIndex -1).
 */
function FloorZoneNode({ data }: TopologyNodeProps) {
  return (
    <div
      className="pointer-events-none relative h-full w-full rounded-2xl border-2 border-dashed"
      style={{
        borderColor: "var(--topo-zone-border)",
        backgroundColor: "var(--topo-zone-bg)",
      }}
      data-testid="topology-floor-zone"
    >
      <span
        className="absolute left-3 top-2.5 rounded-md px-2 text-xs font-semibold leading-5"
        style={{
          backgroundColor: "var(--topo-zone-label-bg)",
          color: "var(--topo-zone-label-fg)",
        }}
      >
        {data.label}
      </span>
    </div>
  );
}

export const FLOOR_ZONE_NODE_TYPE = "floor_zone";

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
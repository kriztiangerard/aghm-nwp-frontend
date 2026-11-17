import type { CSSProperties, ReactNode } from "react";
import {
  Handle,
  Position,
  type Node,
  type NodeProps,
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
 * name and SKU centred underneath. Cards use the plain card surface
 * (white in light mode, near-black in dark mode). Only the icon tile is
 * filled with the role colour, so the symbol is the most prominent mark.
 *
 * All card text goes through <CardText>, which sets its colour explicitly,
 * so global <p> styles cannot recolour it.
 *
 * The node registry lives in flow-types.ts, so this file exports only
 * components (react-refresh/only-export-components).
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

/**
 * Card text. The colour is set explicitly, so global <p> styles can't
 * override it.
 * - "primary": --topo-card-fg on --topo-card-bg (19.8:1 light, 17.0:1 dark)
 * - "muted":   --topo-card-muted (5.1:1 light, 6.9:1 dark; AA ≥ 4.5),
 *              used only for the SKU and detail lines
 */
const TEXT_COLOR: Record<"primary" | "muted", CSSProperties> = {
  primary: { color: "var(--topo-card-fg)" },
  muted: { color: "var(--topo-card-muted)" },
};

function CardText({
  className,
  title,
  tone = "primary",
  children,
}: {
  className?: string;
  title?: string;
  tone?: "primary" | "muted";
  children: ReactNode;
}) {
  return (
    <span
      className={cn("max-w-full", className)}
      style={TEXT_COLOR[tone]}
      title={title}
    >
      {children}
    </span>
  );
}

/**
 * Plain card: the shadcn card surface and border in both modes. Only the
 * icon tile carries the role colour.
 */
const CARD_STYLE: CSSProperties = {
  backgroundColor: "var(--topo-card-bg)",
  color: "var(--topo-card-fg)",
  borderColor: "var(--topo-card-border)",
};

/**
 * Role-coloured symbol tile: 48 px tile, 28 px icon. The tile uses the role
 * fill (--topo-node-<role>-bg) and the icon its contrast colour (-fg),
 * at least 7:1 for every role (see topology-theme.css).
 */
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
      style={{ backgroundColor: colors.bg, color: colors.fg }}
      aria-hidden="true"
    >
      <Icon className="size-7" strokeWidth={2} />
    </span>
  );
}

const ROLE_TEXT_CLASS =
  "block truncate text-[10px] font-bold uppercase leading-[15px] tracking-wide";
/**
 * QA fix (TC-001 step 5): full catalogue names ("TP-Link SG3428MP 24-Port PoE+
 * Switch") are wider than the card, so the product name may wrap to two
 * lines instead of being cut off. layout.ts reserves the second line
 * (nameLineCount); anything longer than two lines ends in an ellipsis, and the
 * full name is in the title.
 */
const NAME_CLASS =
  "line-clamp-2 break-words text-xs font-semibold leading-[15px]";
/** Compact cards (internet, client groups) keep a one-line title. */
const COMPACT_TITLE_CLASS = "block truncate text-xs font-semibold leading-[15px]";
const MINOR_CLASS = "block truncate text-[10px] leading-[15px]";

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
      style={CARD_STYLE}
      data-testid={`topology-node-${data.role}`}
    >
      {quantityText && (
        <span
          className="absolute right-2 top-2 rounded-sm px-1.5 text-[11px] font-bold leading-4 tabular-nums"
          style={{ backgroundColor: colors.bg, color: colors.fg }}
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
            <CardText
              className={cn(MINOR_CLASS, "font-mono")}
              tone="muted"
              title={data.sku}
            >
              SKU {data.sku}
            </CardText>
          )}
        </div>

        {detail && (
          <CardText className={MINOR_CLASS} tone="muted">
            {detail}
          </CardText>
        )}

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
      style={CARD_STYLE}
      data-testid={`topology-node-${data.role}`}
    >
      <IconTile icon={icon} colors={colors} rounded={rounded} />
      <div className="w-full min-w-0">
        <CardText className={COMPACT_TITLE_CLASS} title={title}>
          {title}
        </CardText>
        <CardText className="block truncate text-[11px] leading-[15px] tabular-nums">
          {subtitle}
        </CardText>
      </div>
    </Card>
  );
}

// ---- Role components -------------------------------------------------------

export function WanNode({ data }: TopologyNodeProps) {
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

export function GatewayNode({ data }: TopologyNodeProps) {
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
export function FirewallNode({ data }: TopologyNodeProps) {
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

export function ControllerNode({ data }: TopologyNodeProps) {
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

export function SwitchNode({ data }: TopologyNodeProps) {
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
export function AccessPointNode({ data }: TopologyNodeProps) {
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
export function ClientGroupNode({ data }: TopologyNodeProps) {
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
export function FallbackNode({ data }: TopologyNodeProps) {
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
export function FloorZoneNode({ data }: TopologyNodeProps) {
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
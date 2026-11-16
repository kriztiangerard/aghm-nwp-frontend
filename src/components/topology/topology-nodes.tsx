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
 * Each card is filled with its role colour (--topo-node-<role>-bg), and its
 * text uses the matching contrast colour (-fg). The icon sits in an inverted
 * tile, so it is the most prominent mark on the card.
 *
 * All card text is rendered through <CardText>: a block <span> that
 * explicitly inherits the card colour. The app's global styles give <p> its
 * own colour, which previously overrode the card colour and made the product
 * name and SKU hard to read.
 *
 * Nodes show only role, product name, SKU, quantity or count, and badges.
 * No IP addressing, VLAN IDs, port mappings or rack positions are read or
 * rendered (AC9). Card heights are computed in layout.ts
 * (getNodeDimensions); keep the metrics there in step with this file.
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

/** Side handles for the horizontal spine row (WAN → gateway → core). */
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
    <span className={cn("block", className)} style={INHERIT_COLOR} title={title}>
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

/** Inverted tile: the fg colour as the tile and the card colour as the icon. */
function IconTile({
  icon: Icon,
  colors,
  rounded = "rounded-lg",
}: {
  icon: LucideIcon;
  colors: RoleColors;
  rounded?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center shadow-sm",
        rounded,
      )}
      style={{ backgroundColor: colors.fg, color: colors.bg }}
      aria-hidden="true"
    >
      <Icon className="size-6" strokeWidth={2.25} />
    </span>
  );
}

function StatusBadges({ data }: { data: FlowNodeData }) {
  return data.status === "SUNSETTING" ? <SunsettingBadge /> : null;
}

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
      className="h-full w-full gap-0 overflow-hidden rounded-xl border py-0 shadow-md"
      style={cardStyle(colors)}
      data-testid={`topology-node-${data.role}`}
    >
      <div className="flex h-full min-w-0 flex-col gap-1.5 p-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <IconTile icon={icon ?? roleIcon(data.role)} colors={colors} />

          <div className="min-w-0 flex-1 leading-[15px]">
            <div className="flex min-w-0 items-center gap-1">
              <CardText className="truncate text-[10px] font-bold uppercase leading-[15px] tracking-wide">
                {roleText(data)}
              </CardText>
              {quantityText && (
                <span
                  className="ml-auto shrink-0 rounded-sm px-1.5 text-[11px] font-bold leading-4 tabular-nums"
                  style={{ backgroundColor: colors.fg, color: colors.bg }}
                >
                  {quantityText}
                </span>
              )}
            </div>

            <CardText
              className="truncate text-xs font-semibold leading-[15px]"
              title={name}
            >
              {name}
            </CardText>

            {data.sku && (
              <CardText
                className="truncate font-mono text-[10px] leading-[15px]"
                title={data.sku}
              >
                SKU {data.sku}
              </CardText>
            )}
          </div>
        </div>

        {detail && (
          <CardText className="truncate text-[10px] leading-[15px]">
            {detail}
          </CardText>
        )}

        {badges && <div className="flex flex-wrap gap-1">{badges}</div>}
      </div>
    </Card>
  );
}

const quantityIfMany = (qty?: number) =>
  typeof qty === "number" && qty > 1 ? `×${qty}` : undefined;

// ---- Role components -------------------------------------------------------

function WanNode({ data }: TopologyNodeProps) {
  const colors = roleColors("wan");

  return (
    <>
      <Card
        role="group"
        aria-label={nodeA11yLabel(data)}
        className="h-full w-full flex-row items-center gap-2.5 rounded-full border py-0 pl-2 pr-4 shadow-md"
        style={cardStyle(colors)}
        data-testid="topology-node-wan"
      >
        <IconTile
          icon={roleIcon("wan")}
          colors={colors}
          rounded="rounded-full"
        />
        <div className="min-w-0">
          <CardText className="text-[10px] font-bold uppercase leading-[15px] tracking-wide">
            Internet / WAN
          </CardText>
          <CardText
            className="truncate text-xs font-semibold leading-[15px]"
            title={data.label}
          >
            {data.label}
          </CardText>
        </div>
      </Card>
      <SourceBottom />
      <SpineHandles />
    </>
  );
}

function GatewayNode({ data }: TopologyNodeProps) {
  return (
    <>
      <TargetTop />
      <DeviceNodeCard
        data={data}
        quantityText={quantityIfMany(data.qty)}
        badges={
          (data.integrates?.length ?? 0) > 0 || data.status === "SUNSETTING" ? (
            <>
              {(data.integrates ?? []).map((fn) => (
                <IntegratedFunctionBadge key={fn} fn={fn} />
              ))}
              <StatusBadges data={data} />
            </>
          ) : undefined
        }
      />
      <SourceBottom />
      <SpineHandles />
    </>
  );
}

/** Sits below the gateway; linked by the dashed "Built-in" logical edge (AC2). */
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
              <StatusBadges data={data} />
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
        badges={data.status === "SUNSETTING" ? <StatusBadges data={data} /> : undefined}
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
        badges={data.status === "SUNSETTING" ? <StatusBadges data={data} /> : undefined}
      />
      <SourceBottom />
      {data.layer === "core" && <SpineHandles />}
    </>
  );
}

/** AC10: one grouped node, with the plan's total AP count and its single model. */
function AccessPointNode({ data }: TopologyNodeProps) {
  const qty = typeof data.qty === "number" ? data.qty : undefined;

  return (
    <>
      <TargetTop />
      <DeviceNodeCard
        data={data}
        quantityText={qty !== undefined ? `×${qty}` : undefined}
        detail={
          qty !== undefined
            ? `${qty} access point${qty === 1 ? "" : "s"} · one model`
            : undefined
        }
        badges={data.status === "SUNSETTING" ? <StatusBadges data={data} /> : undefined}
      />
      <SourceBottom />
    </>
  );
}

/** AC5: one node per client kind, carrying a count instead of one node per device. */
function ClientGroupNode({ data }: TopologyNodeProps) {
  const colors = roleColors("client_group");

  return (
    <>
      <TargetTop />
      <Card
        role="group"
        aria-label={nodeA11yLabel(data)}
        className="h-full w-full flex-row items-center gap-2.5 rounded-xl border px-2.5 py-0 shadow-md"
        style={cardStyle(colors)}
        data-testid="topology-node-client_group"
      >
        <IconTile icon={clientIcon(data.clientKind)} colors={colors} />
        <div className="min-w-0">
          <CardText
            className="truncate text-xs font-semibold leading-[15px]"
            title={data.label}
          >
            {data.label}
          </CardText>
          <CardText className="text-[11px] leading-[15px] tabular-nums">
            {clientCountText(data.count)}
          </CardText>
        </div>
      </Card>
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
        badges={data.status === "SUNSETTING" ? <StatusBadges data={data} /> : undefined}
      />
      <SourceBottom />
    </>
  );
}

export const topologyNodeTypes: NodeTypes = {
  wan: WanNode,
  gateway: GatewayNode,
  firewall: FirewallNode,
  controller: ControllerNode,
  switch: SwitchNode,
  access_point: AccessPointNode,
  client_group: ClientGroupNode,
  default: FallbackNode,
};
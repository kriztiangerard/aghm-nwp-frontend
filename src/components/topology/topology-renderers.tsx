import {
  Globe,
  Router,
  Shield,
  Server,
  Network,
  Wifi,
  Monitor,
} from "lucide-react";
import {
  SmoothStepEdge,
  BaseEdge,
  Handle,
  Position,
  type Node,
  type NodeProps,
  type NodeTypes,
  type EdgeTypes,
  type EdgeProps,
} from "@xyflow/react";
import type { FlowNodeData, SnapshotHandlePosition } from "./types";

const DEVICE_ICONS = {
  wan: Globe,
  gateway: Router,
  firewall: Shield,
  controller: Server,
  switch: Network,
  access_point: Wifi,
  client_group: Monitor,
} as const;

export function TopologyNodeView({
  data,
}: NodeProps<Node<FlowNodeData>>) {
  const Icon =
    DEVICE_ICONS[data.role as keyof typeof DEVICE_ICONS] ?? Network;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border bg-card px-2 py-2 text-center shadow-sm">
      <Handle type="target" position={Position.Top} />

      <Icon
        className="mb-1 h-5 w-5 shrink-0 text-primary-text"
        aria-hidden="true"
      />

      <p className="max-w-full truncate text-xs font-semibold">
        {data.label}
      </p>

      {data.sku && (
        <p className="max-w-full truncate text-[10px] text-muted-foreground">
          {data.sku}
        </p>
      )}

      {data.qty !== undefined && (
        <p className="text-[10px]">Qty: {data.qty}</p>
      )}

      {data.count !== undefined && data.count !== null && (
        <p className="text-[10px]">Devices: {data.count}</p>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const SNAPSHOT_HANDLE_POSITIONS: Record<SnapshotHandlePosition, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

// Print-friendly icon tile colors based on the TOPO-003 light palette.
const SNAPSHOT_ICON_COLORS = {
  wan: { backgroundColor: "#201923", color: "#ffffff" },
  gateway: { backgroundColor: "#7900bd", color: "#ffffff" },
  firewall: { backgroundColor: "#a50064", color: "#ffffff" },
  controller: { backgroundColor: "#005e4b", color: "#ffffff" },
  switch: { backgroundColor: "#00be88", color: "#18181b" },
  access_point: { backgroundColor: "#57e7b3", color: "#18181b" },
  client_group: { backgroundColor: "#f4f4f5", color: "#18181b" },
} satisfies Record<
  keyof typeof DEVICE_ICONS,
  { backgroundColor: string; color: string }
>;

const SNAPSHOT_CARD_COLORS: Record<keyof typeof DEVICE_ICONS, string> = {
  wan: "#f1eef3",
  gateway: "#f3e8ff",
  firewall: "#fce7f3",
  controller: "#e0f2ee",
  switch: "#d9f8ec",
  access_point: "#e8fbf3",
  client_group: "#f4f4f5",
};

function snapshotTextKey(value?: string | null): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function TopologyExportNodeView({
  data,
}: NodeProps<Node<FlowNodeData>>) {
  const role = data.role as keyof typeof DEVICE_ICONS;
  const Icon = DEVICE_ICONS[role] ?? Network;
  const iconColors =
    SNAPSHOT_ICON_COLORS[role] ?? SNAPSHOT_ICON_COLORS.client_group;
  const cardColor =
    SNAPSHOT_CARD_COLORS[role] ?? SNAPSHOT_CARD_COLORS.client_group;

  const roleLabel = data.role.replaceAll("_", " ");
  const label = data.label?.trim() || roleLabel;
  const labelKey = snapshotTextKey(label);
  const roleKey = snapshotTextKey(roleLabel);
  const nameKey = snapshotTextKey(data.name);
  const skuKey = snapshotTextKey(data.sku);

  const showRole = roleKey !== labelKey;
  const showName = nameKey !== "" && nameKey !== labelKey && nameKey !== roleKey;
  const showSku =
    skuKey !== "" &&
    skuKey !== labelKey &&
    skuKey !== roleKey &&
    skuKey !== nameKey;

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-gray-300 px-2 py-1 text-center shadow-sm"
      style={{ backgroundColor: cardColor }}
    >
      {(data.snapshotHandles ?? []).map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type={handle.type}
          position={SNAPSHOT_HANDLE_POSITIONS[handle.position]}
          style={
            handle.position === "top" || handle.position === "bottom"
              ? { left: `${handle.offset}%` }
              : { top: `${handle.offset}%` }
          }
        />
      ))}

      <span
        aria-hidden="true"
        className={`mb-0.5 flex h-5 w-5 shrink-0 items-center justify-center ${
          role === "wan" ? "rounded-full" : "rounded-md"
        }`}
        style={iconColors}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </span>

      {showRole && (
        <p className="w-full whitespace-normal break-words text-[10px] font-semibold capitalize leading-tight text-gray-600">
          {roleLabel}
        </p>
      )}

      <p className="w-full whitespace-normal break-words text-[11px] font-bold leading-tight text-gray-900">
        {label}
      </p>

      {showName && (
        <p className="w-full whitespace-normal break-words text-[10px] leading-tight text-gray-900">
          {data.name}
        </p>
      )}

      {showSku && (
        <p className="w-full whitespace-normal break-words text-[10px] leading-tight text-gray-600">
          {data.sku}
        </p>
      )}

      {data.qty !== undefined && (
        <p className="text-[10px] leading-tight text-gray-900">
          Qty: {data.qty}
        </p>
      )}

      {data.count !== undefined && data.count !== null && (
        <p className="text-[10px] leading-tight text-gray-900">
          Devices: {data.count}
        </p>
      )}
    </div>
  );
}

export const nodeTypes: NodeTypes = {
  wan: TopologyNodeView,
  gateway: TopologyNodeView,
  firewall: TopologyNodeView,
  controller: TopologyNodeView,
  switch: TopologyNodeView,
  access_point: TopologyNodeView,
  client_group: TopologyNodeView,
  default: TopologyNodeView,
};

export const exportNodeTypes: NodeTypes = {
  wan: TopologyExportNodeView,
  gateway: TopologyExportNodeView,
  firewall: TopologyExportNodeView,
  controller: TopologyExportNodeView,
  switch: TopologyExportNodeView,
  access_point: TopologyExportNodeView,
  client_group: TopologyExportNodeView,
  default: TopologyExportNodeView,
};

export const edgeTypes: EdgeTypes = {
  wan: SmoothStepEdge,
  uplink: SmoothStepEdge,
  poe: SmoothStepEdge,
  access: SmoothStepEdge,
  management: SmoothStepEdge,
};

// Snapshot-only renderer for the Floor Switch → AP connection.
export function SnapshotPoeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
}: EdgeProps) {
  return (
    <BaseEdge
      id={id}
      path={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`}
      style={style}
      markerEnd={markerEnd}
    />
  );
}

export function SnapshotCoreUplinkEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
  markerEnd,
}: EdgeProps) {
  const requestedLaneX = Number(data?.snapshotLaneX);
  const laneX = Number.isFinite(requestedLaneX)
    ? requestedLaneX
    : Math.min(sourceX, targetX) - 24;

  const path = [
    `M ${sourceX} ${sourceY}`,
    `H ${laneX}`,
    `V ${targetY}`,
    `H ${targetX}`,
  ].join(" ");

  return (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      markerEnd={markerEnd}
    />
  );
}

// Route AP → Clients 3 / Clients 4 through the gap between card rows.
export function SnapshotAPRow2Edge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
  markerEnd,
}: EdgeProps) {
  const requestedLaneX = Number(data?.snapshotLaneX);
  const laneX = Number.isFinite(requestedLaneX)
    ? requestedLaneX
    : Math.max(sourceX, targetX) + 16;

  const requestedJog = Number(data?.snapshotJogY);
  const jogY =
    sourceY + (Number.isFinite(requestedJog) ? requestedJog : 14);

  const path = [
    `M ${sourceX} ${sourceY}`,
    `V ${jogY}`,
    `H ${laneX}`,
    `V ${targetY}`,
    `H ${targetX}`,
  ].join(" ");

  return (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      markerEnd={markerEnd}
    />
  );
}

export const snapshotEdgeTypes: EdgeTypes = {
  ...edgeTypes,
  poe: SnapshotPoeEdge,
  snapshotCoreUplink: SnapshotCoreUplinkEdge,
  snapshotAPRow2: SnapshotAPRow2Edge,
};
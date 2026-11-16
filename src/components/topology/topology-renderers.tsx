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
import type {
  FlowNodeData,
  SnapshotHandlePosition,
} from "./types";

const DEVICE_ICONS = {
  wan: Globe,
  gateway: Router,
  firewall: Shield,
  controller: Server,
  switch: Network,
  access_point: Wifi,
  client_group: Monitor,
} as const;

// Original screen renderer — preserve existing appearance.
export function TopologyNodeView({
  data,
}: NodeProps<Node<FlowNodeData>>) {
  const Icon =
    DEVICE_ICONS[data.role as keyof typeof DEVICE_ICONS] ?? Network;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center  rounded-lg border bg-card px-2 py-2 text-center shadow-sm">
      <Handle type="target" position={Position.Top} />

      <Icon
        className="mb-1 h-5 w-5 shrink-0 text-primary"
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

const SNAPSHOT_HANDLE_POSITIONS: Record<
  SnapshotHandlePosition,
  Position
> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

// Export renderer — displays role, label, product name, and SKU.
export function TopologyExportNodeView({
  data,
}: NodeProps<Node<FlowNodeData>>) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center  overflow-hidden rounded-lg border border-gray-300 bg-white px-2 py-1 text-center text-black shadow-sm">
      {(data.snapshotHandles ?? []).map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type={handle.type}
          position={SNAPSHOT_HANDLE_POSITIONS[handle.position]}
          style={
            handle.position === "top" ||
            handle.position === "bottom"
              ? { left: `${handle.offset}%` }
              : { top: `${handle.offset}%` }
          }
        />
      ))}

      <p className="w-full whitespace-normal break-words text-[10px] font-semibold leading-tight capitalize text-gray-600">
        {data.role.replaceAll("_", " ")}
      </p>

      <p className="w-full whitespace-normal break-words text-[11px] font-bold leading-tight">
        {data.label}
      </p>

      {data.name && (
        <p className="w-full whitespace-normal break-words text-[10px] leading-tight">
          {data.name}
        </p>
      )}

      {data.sku && (
        <p className="w-full whitespace-normal break-words text-[10px] leading-tight text-gray-600">
          {data.sku}
        </p>
      )}

      {data.qty !== undefined && (
        <p className="text-[10px] leading-tight">Qty: {data.qty}</p>
      )}

      {data.count !== undefined && data.count !== null && (
        <p className="text-[10px] leading-tight">
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
// Uses the assigned right/left handles and draws one direct line.
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

// AP → Clients 3 / Clients 4.
// Down from the AP's bottom handle, across inside the gap below the AP/switch
// row, down the lane right of the target column, then left into the target's
// right handle. Nothing passes behind a card.
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

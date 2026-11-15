
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
  Handle,
  Position,
  type Node,
  type NodeProps,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import type { FlowNodeData } from "./types";

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
    <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border bg-card px-2 py-2 text-center shadow-sm">
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

// Export renderer — displays role, label, product name, and SKU.
export function TopologyExportNodeView({
  data,
}: NodeProps<Node<FlowNodeData>>) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-gray-300 bg-white px-2 py-1 text-center text-black shadow-sm">
      <Handle type="target" position={Position.Top} />

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

      <Handle type="source" position={Position.Bottom} />
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

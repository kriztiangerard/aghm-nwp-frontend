
import type {
  NetworkPlanData,
  VendorPlansPayload,
} from "./types";
import type {
  TopologyNode,
  TopologyEdge,
} from "@/components/topology/types";

const nodes: TopologyNode[] = [
  { id: "wan", role: "wan", layer: "wan", label: "Internet / WAN" },
  { id: "gateway", role: "gateway", layer: "gateway", label: "Gateway" },
  { id: "core", role: "switch", layer: "core", label: "Core Switch" },
];

const edges: TopologyEdge[] = [
  { id: "wan-gateway", source: "wan", target: "gateway", type: "wan" },
  { id: "gateway-core", source: "gateway", target: "core", type: "uplink" },
];

for (let floor = 1; floor <= 5; floor += 1) {
  const sw = `floor-${floor}-switch`;
  const ap = `floor-${floor}-ap`;

  nodes.push(
    { id: sw, role: "switch", layer: "access", label: `Floor ${floor} Switch` },
    { id: ap, role: "access_point", layer: "edge", label: `Floor ${floor} AP` },
  );

  edges.push(
    { id: `core-${sw}`, source: "core", target: sw, type: "uplink" },
    { id: `${sw}-${ap}`, source: sw, target: ap, type: "poe" },
  );

  for (let group = 1; group <= 4; group += 1) {
    const id = `floor-${floor}-clients-${group}`;

    nodes.push({
      id,
      role: "client_group",
      layer: "edge",
      label: `Floor ${floor} Clients ${group}`,
      count: 10,
    });

    edges.push({
      id: `${ap}-${id}`,
      source: ap,
      target: id,
      type: "access",
    });
  }

  for (const kind of ["cameras", "voip"]) {
    const id = `floor-${floor}-${kind}`;

    nodes.push({
      id,
      role: "client_group",
      layer: "edge",
      label: `Floor ${floor} ${kind}`,
      clientKind: kind,
    });

    edges.push({
      id: `${sw}-${id}`,
      source: sw,
      target: id,
      type: "access",
    });
  }
}

const stressPlan: NetworkPlanData = {
  vendor: "TP-Link Omada",
  tier: "Cost-Efficient",
  bom: [],
  generatedAt: "2026-11-14T03:00:00.000Z",
  currency: "PHP",
  totalCost: 0,
  totalIsPartial: false,
  complete: true,
  unmet: [],
  topology: { nodes, edges },
};

export const topo002StressScenario: VendorPlansPayload = {
  "TP-Link Omada": {
    "Cost-Efficient": stressPlan,
  },
};

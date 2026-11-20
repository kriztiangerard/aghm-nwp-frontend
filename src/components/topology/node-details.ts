import type { BomLineItem } from "@/components/comparison/types";
import { formatCurrency, formatDate } from "@/components/comparison/format";
import { productName, roleText } from "./node-display";
import type { FlowNodeData } from "./types";

/**
 * NWP-TOPO-004: what the details panel shows for a selected node.
 *
 * Hardware nodes (AC4) take their figures from the plan's BOM line, so the
 * panel always agrees with the hardware summary table: the quantity is the
 * plan-wide quantity, and a missing price reads "Price on request".
 * Client groups (AC5) show the device type and count from the questionnaire,
 * carried in the engine's client_group node.
 *
 * Like the node cards, this reads only product, quantity, price, count and
 * lifecycle fields. No IP, VLAN, port or rack data (out of scope).
 */

export interface DetailRow {
  label: string;
  value: string;
}

export interface NodeDetails {
  kind: "hardware" | "client_group" | "wan";
  /** Panel title: the product name, client type, or "Internet". */
  title: string;
  /** Line under the title: the node's role. */
  subtitle: string;
  rows: DetailRow[];
  /** Short notes shown under the rows (integration, floor split, stale price). */
  notes: string[];
}

export const PRICE_ON_REQUEST = "Price on request";

const CLIENT_KIND_LABELS: Record<string, string> = {
  wired_pcs: "Wired PCs",
  wifi_devices: "Wi-Fi devices",
  voip_phones: "VoIP phones",
  cameras: "IP cameras",
  other_devices: "Other devices",
};

const STATUS_LABELS: Record<NonNullable<BomLineItem["status"]>, string> = {
  ACTIVE: "Active",
  SUNSETTING: "Sunsetting (confirm availability with the distributor)",
  DISCONTINUED: "Discontinued",
};

/** Frontend BOM categories are display names ("Access Point"); roles are snake_case. */
const normalise = (value: string | undefined) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

/** Same SKU and matching category first, otherwise the first line with that SKU. */
export function findBomLineForNode(
  data: FlowNodeData,
  bom: BomLineItem[],
): BomLineItem | undefined {
  if (!data.sku) return undefined;
  const sameSku = bom.filter((line) => line.sku === data.sku);
  return (
    sameSku.find((line) => normalise(line.category) === normalise(data.role)) ??
    sameSku[0]
  );
}

function clientDetails(data: FlowNodeData): NodeDetails {
  const deviceType =
    (data.clientKind && CLIENT_KIND_LABELS[data.clientKind]) || data.label;
  const countText =
    typeof data.count === "number" ? String(data.count) : "Not specified";

  const rows: DetailRow[] = [{ label: "Device type", value: deviceType }];
  const notes: string[] = [];

  if (data.floorLabel && typeof data.planTotal === "number") {
    rows.push(
      { label: `Count on ${data.floorLabel}`, value: countText },
      { label: "Count in the whole plan", value: String(data.planTotal) },
    );
  } else {
    rows.push({ label: "Count", value: countText });
  }

  notes.push("From your questionnaire answers.");

  return {
    kind: "client_group",
    title: data.label,
    subtitle: "Client group",
    rows,
    notes,
  };
}

function hardwareDetails(
  data: FlowNodeData,
  bom: BomLineItem[],
  currency: string,
): NodeDetails {
  const line = findBomLineForNode(data, bom);
  const quantity = line?.quantity ?? data.qty;
  const status = line?.status ?? data.status;

  const rows: DetailRow[] = [
    { label: "Model", value: line?.name ?? productName(data) },
    { label: "SKU", value: data.sku ?? line?.sku ?? "Not specified" },
    { label: "Category", value: line?.category ?? roleText(data) },
    {
      label: "Quantity in plan",
      value: typeof quantity === "number" ? String(quantity) : "Not specified",
    },
    {
      label: "Unit price",
      value:
        line && line.unitPrice !== null
          ? formatCurrency(line.unitPrice, currency)
          : PRICE_ON_REQUEST,
    },
    {
      label: "Lifecycle status",
      value: status ? STATUS_LABELS[status] : "Not specified",
    },
  ];

  const notes: string[] = [];

  if (data.integratedWith) {
    notes.push(
      "Built into the gateway. It is the same device, so it is counted and priced on the gateway's line.",
    );
  }
  for (const fn of data.integrates ?? []) {
    notes.push(`Also provides the ${fn} function.`);
  }
  if (data.floorLabel && typeof data.qty === "number") {
    notes.push(`${data.qty} of these are on ${data.floorLabel}.`);
  }
  if (line?.isStale && line.unitPrice !== null) {
    notes.push(
      `This price could not be refreshed in the latest update. Last verified ${formatDate(line.priceUpdatedAt) || "date unknown"}.`,
    );
  }
  if (line?.priceSource === "manual" && line.unitPrice !== null) {
    notes.push("This price was entered manually.");
  }

  return {
    kind: "hardware",
    title: line?.name ?? productName(data),
    subtitle: roleText(data),
    rows,
    notes,
  };
}

export function buildNodeDetails(
  data: FlowNodeData,
  bom: BomLineItem[],
  currency = "PHP",
): NodeDetails {
  if (data.role === "client_group") return clientDetails(data);

  if (data.role === "wan") {
    return {
      kind: "wan",
      title: data.label || "Internet",
      subtitle: "Internet service",
      rows: [],
      notes: [
        "Your internet connection from the ISP. It is not part of the hardware list.",
      ],
    };
  }

  return hardwareDetails(data, bom, currency);
}

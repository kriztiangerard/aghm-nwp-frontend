// src/components/comparison/fixtures.ts  (dev/QA only, never imported by Comparison)
import type { BomLineItem, NetworkPlanData, PlanTier, VendorName, VendorPlansPayload } from "./types";
import { engineScenarios } from "./engine-sample-fixtures.ts";
import { topo002StressScenario } from "./topo002-stress-fixture";
import { topo003QaScenarios } from "./topo003-fixtures";

const AT = "Oct 28, 2026, 9:00 AM";

const line = (o: Partial<BomLineItem> & Pick<BomLineItem, "sku" | "name" | "category" | "quantity" | "unitPrice">): BomLineItem => ({
  status: "ACTIVE", priceSource: "synchronized", isStale: false,
  priceUpdatedAt: "2026-10-27", isGeneric: false,
  subtotal: o.unitPrice === null ? null : o.unitPrice * o.quantity,
  ...o,
});

const plan = (vendor: VendorName, tier: PlanTier, bom: BomLineItem[], extra: Partial<NetworkPlanData> = {}): NetworkPlanData => ({
  vendor, tier, bom, generatedAt: AT, currency: "PHP",
  totalCost: bom.reduce((s, l) => s + (l.subtotal ?? 0), 0),
  totalIsPartial: bom.some((l) => l.unitPrice === null),
  complete: true, unmet: [], ...extra,
});

const topologyForBom = (bom: BomLineItem[]): NonNullable<NetworkPlanData["topology"]> => {
  const gateway = bom.find((item) => item.category === "Gateway");
  if (!gateway) throw new Error("Happy topology fixture requires a gateway BOM item.");

  const accessPoints = bom.filter((item) => item.category === "Access Point");
  const accessPointNodes = accessPoints.map((item, index) => ({
    id: `access-point-${index + 1}`,
    role: "access_point",
    layer: "edge",
    label: item.name,
    sku: item.sku,
    qty: item.quantity,
  }));

  return {
    nodes: [
      { id: "wan", role: "wan", layer: "wan", label: "Internet" },
      {
        id: "gateway",
        role: "gateway",
        layer: "gateway",
        label: gateway.name,
        sku: gateway.sku,
        qty: gateway.quantity,
      },
      ...accessPointNodes,
    ],
    edges: [
      {
        id: "wan-gateway",
        source: "wan",
        target: "gateway",
        type: "wan",
        medium: "fiber",
      },
      ...accessPoints.map((item, index) => ({
        id: `gateway-access-point-${index + 1}`,
        source: "gateway",
        target: `access-point-${index + 1}`,
        type: "poe",
        medium: "copper" as const,
        count: item.quantity,
      })),
    ],
  };
};

const bigBom = [
  line({ sku: "ER605", name: "Omada Gigabit VPN Router", category: "Gateway", quantity: 1, unitPrice: 3500 }),
  ...Array.from({ length: 39 }, (_, i) => line({ sku: `SW-${i + 1}`, name: `Test switch ${i + 1}`, category: "Switch", quantity: 1, unitPrice: 1000 + i })),
];

const omadaCEBom = [
  line({ sku: "ER605", name: "Omada Gigabit VPN Router", category: "Gateway", quantity: 1, unitPrice: 3500 }),
  line({ sku: "EAP610", name: "Omada AX1800 Ceiling AP", category: "Access Point", quantity: 2, unitPrice: 5200 }),
];
const omadaCE = plan("TP-Link Omada", "Cost-Efficient", omadaCEBom, {
  topology: topologyForBom(omadaCEBom),
});

const omadaHPBom = [
  line({ sku: "ER7206", name: "Omada Multi-Gigabit VPN Router", category: "Gateway", quantity: 1, unitPrice: 9800 }),
  line({ sku: "EAP670", name: "Omada AX5400 Ceiling AP", category: "Access Point", quantity: 2, unitPrice: 8900 }),
];
const omadaHP = plan("TP-Link Omada", "High-Performance", omadaHPBom, {
  topology: topologyForBom(omadaHPBom),
});

const unifiCEBom = [
  line({ sku: "UDR", name: "UniFi Dream Router", category: "Gateway", quantity: 1, unitPrice: 12000 }),
];
const unifiCE = plan("Ubiquiti UniFi", "Cost-Efficient", unifiCEBom, {
  topology: topologyForBom(unifiCEBom),
});

const unifiHPBom = [
  line({ sku: "UDM-Pro", name: "UniFi Dream Machine Pro", category: "Gateway", quantity: 1, unitPrice: 23000 }),
];
const unifiHP = plan("Ubiquiti UniFi", "High-Performance", unifiHPBom, {
  topology: topologyForBom(unifiHPBom),
});

export const scenarios: Record<string, VendorPlansPayload | undefined> = {
  bigBom: { "TP-Link Omada": {
  "Cost-Efficient": plan("TP-Link Omada", "Cost-Efficient", bigBom, { topology: topologyForBom(bigBom) }),
  "High-Performance": plan("TP-Link Omada", "High-Performance", bigBom, { topology: topologyForBom(bigBom) }),
  } },
  loading: undefined,                                   // AC 1 loading state
  empty: {},                                            // AC 1 empty state
  happy: {                                              // AC 1, 2, 3, 4, 5, 6
    "TP-Link Omada": { "Cost-Efficient": omadaCE, "High-Performance": omadaHP },
    "Ubiquiti UniFi": { "Cost-Efficient": unifiCE, "High-Performance": unifiHP },
  },
  partial: {                                            // AC 2: options filtered per tier, no crash
    "TP-Link Omada": { "Cost-Efficient": omadaCE, "High-Performance": omadaHP },
    "Ubiquiti UniFi": { "Cost-Efficient": unifiCE },    // no HP for UniFi
  },
  nullPrice: {                                          // AC 4: "Price unavailable", partial total
    "TP-Link Omada": {
      "Cost-Efficient": plan("TP-Link Omada", "Cost-Efficient", [
        line({ sku: "ER605", name: "Omada Gigabit VPN Router", category: "Gateway", quantity: 1, unitPrice: 3500 }),
        line({ sku: "OC200", name: "Omada Hardware Controller", category: "Controller", quantity: 1, unitPrice: null }),
      ]),
    },
  },
  lineStates: {                                         // AC 4: stale, manual, Sunsetting, generic
    "TP-Link Omada": {
      "Cost-Efficient": plan("TP-Link Omada", "Cost-Efficient", [
        line({ sku: "ER605", name: "Omada Gigabit VPN Router", category: "Gateway", quantity: 1, unitPrice: 3500, status: "SUNSETTING" }),
        line({ sku: "EAP610", name: "Omada AX1800 Ceiling AP", category: "Access Point", quantity: 2, unitPrice: 5200, isStale: true, priceUpdatedAt: "2026-09-30" }),
        line({ sku: "SW-8", name: "Omada 8-Port PoE Switch", category: "Switch", quantity: 1, unitPrice: 4100, priceSource: "manual" }),
        line({ sku: "WALL-9U", name: "Generic 9U Wall Cabinet", category: "Enclosure", quantity: 1, unitPrice: 6500, isGeneric: true }),
      ]),
    },
  },
  pricingStates: {
    "TP-Link Omada": {
      "Cost-Efficient": plan("TP-Link Omada", "Cost-Efficient", [
        line({
          sku: "QA-MANUAL-STALE",
          name: "QA Gateway - Stale Manual Price",
          category: "Gateway",
          quantity: 1,
          unitPrice: 3500,
          priceSource: "manual",
          isStale: true,
          priceUpdatedAt: "2026-09-01",
        }),
        line({
          sku: "QA-SYNC-FRESH",
          name: "QA Access Point - Fresh Synchronized Price",
          category: "Access Point",
          quantity: 2,
          unitPrice: 5200,
          priceSource: "synchronized",
          isStale: false,
          priceUpdatedAt: "2026-11-14",
        }),
        line({
          sku: "QA-MANUAL-FRESH",
          name: "QA Switch - Fresh Manual Price",
          category: "Switch",
          quantity: 1,
          unitPrice: 4100,
          priceSource: "manual",
          isStale: false,
          priceUpdatedAt: "2026-11-14",
        }),
        line({
          sku: "QA-SYNC-STALE",
          name: "QA Controller - Stale Synchronized Price",
          category: "Controller",
          quantity: 1,
          unitPrice: 6500,
          priceSource: "synchronized",
          isStale: true,
          priceUpdatedAt: "2026-08-15",
        }),
      ]),
    },
  },
  longBom: {
    "TP-Link Omada": {
      "Cost-Efficient": plan(
        "TP-Link Omada",
        "Cost-Efficient",
        Array.from({ length: 75 }, (_, index) =>
          line({
            sku: `QA-BOM-${String(index + 1).padStart(3, "0")}`,
            name: `QA Pagination Device ${index + 1}`,
            category: "Switch",
            quantity: 1,
            unitPrice: 1000 + index * 50,
            priceSource: "manual",
            isStale: false,
            priceUpdatedAt: "2026-11-14",
          }),
        ),
      ),
    },
  },
  incomplete: {                                         // AC 4: unmet list, no "complete" check mark
    "TP-Link Omada": {
      "Cost-Efficient": plan("TP-Link Omada", "Cost-Efficient", omadaCE.bom, {
        complete: false,
        unmet: ["No gateway in the catalog meets the required 2,000 Mbps routing throughput."],
      }),
    },
  },
  ...engineScenarios, // engineSample, engineSampleComplete, engineSampleMixed
  topo002Stress: topo002StressScenario,
  ...topo003QaScenarios, // TOPO-003 QA: one button per fixture, "topo003:<name>"


};
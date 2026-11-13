import { adaptEngineResult, type EngineResult } from "./adapter";
import type { VendorPlansPayload } from "./types";

// A real engine output (both plans incomplete: no generic enclosure row in the catalog).
// Run through the real adapter so the dev page also exercises it.
export const engineSample: EngineResult = {
  contractVersion: "3.0.0",
  generatedAt: "2026-11-08T06:40:12.000Z",
  plans: [
    {
      vendor: "TP-Link Omada",
      planType: "CE",
      complete: false,
topology: {
  nodes: [
    { id: "wan-1", role: "wan", layer: "wan", label: "Internet" },
    { id: "gateway-1", role: "gateway", layer: "gateway", label: "Gateway", sku: "ER7206", qty: 1 },
    { id: "switch-1", role: "switch", layer: "core", label: "Core Switch", sku: "SG3428", qty: 1 },
    { id: "controller-1", role: "controller", layer: "management", label: "Controller", sku: "OC200", qty: 1 },
    { id: "ap-1", role: "access_point", layer: "edge", label: "Access Points", sku: "EAP610", qty: 4 },
    { id: "clients-1", role: "client_group", layer: "edge", label: "Wi-Fi Clients", count: 40, clientKind: "wifi_devices" },
  ],
  edges: [
    { id: "e1", source: "wan-1", target: "gateway-1", type: "wan" },
    { id: "e2", source: "gateway-1", target: "switch-1", type: "uplink" },
    { id: "e3", source: "gateway-1", target: "controller-1", type: "management" },
    { id: "e4", source: "switch-1", target: "ap-1", type: "poe" },
    { id: "e5", source: "ap-1", target: "clients-1", type: "access" },
  ],
},
items: [
  { category: "gateway", sku: "ER7206", qty: 1 },
        { category: "switch", sku: "SG3428", qty: 1 },
        { category: "access_point", sku: "EAP610", qty: 4 },
        { category: "controller", sku: "OC200", qty: 1 },
      ],
      bom: {
        currency: "PHP",
        lines: [
          { sku: "ER7206", qty: 1, unitPrice: 9000, lineTotal: 9000 },
          { sku: "SG3428", qty: 1, unitPrice: 15000, lineTotal: 15000 },
          { sku: "EAP610", qty: 4, unitPrice: 5000, lineTotal: 20000 },
          { sku: "OC200", qty: 1, unitPrice: 6000, lineTotal: 6000 },
        ],
        total: 50000,
        totalIsPartial: true,
      },
      optics: null,
      unmet: [
        {
          category: "enclosure",
          vendor: "TP-Link Omada",
          reason: "no generic enclosure row in the catalog",
        },
      ],
      flags: [{ code: "SKU_SUNSETTING", message: "SG3428: confirm availability" }],
    },
    {
      vendor: "TP-Link Omada",
      planType: "HP",
      complete: false,
topology: {
  nodes: [
    { id: "wan-1", role: "wan", layer: "wan", label: "Internet" },
    { id: "gateway-1", role: "gateway", layer: "gateway", label: "Gateway", sku: "ER8411", qty: 1 },
    { id: "switch-1", role: "switch", layer: "core", label: "Core Switch", sku: "SG3428", qty: 1 },
    { id: "ap-1", role: "access_point", layer: "edge", label: "Access Points", sku: "EAP670", qty: 5 },
    { id: "clients-1", role: "client_group", layer: "edge", label: "Wi-Fi Clients", count: 60, clientKind: "wifi_devices" },
  ],
  edges: [
    { id: "e1", source: "wan-1", target: "gateway-1", type: "wan" },
    { id: "e2", source: "gateway-1", target: "switch-1", type: "uplink" },
    { id: "e3", source: "switch-1", target: "ap-1", type: "poe" },
    { id: "e4", source: "ap-1", target: "clients-1", type: "access" },
  ],
},
items: [
  { category: "gateway", sku: "ER8411", qty: 1 },
        { category: "switch", sku: "SG3428", qty: 1 },
        { category: "access_point", sku: "EAP670", qty: 5 },
      ],
      bom: {
        currency: "PHP",
        lines: [
          { sku: "ER8411", qty: 1, unitPrice: 30000, lineTotal: 30000 },
          { sku: "SG3428", qty: 1, unitPrice: 15000, lineTotal: 15000 },
          { sku: "EAP670", qty: 5, unitPrice: 8000, lineTotal: 40000 },
        ],
        total: 85000,
        totalIsPartial: true,
      },
      optics: null,
      unmet: [
        {
          category: "controller",
          vendor: "TP-Link Omada",
          reason: "no controller in the catalog for TP-Link Omada",
        },
        {
          category: "enclosure",
          vendor: "TP-Link Omada",
          reason: "no generic enclosure row in the catalog",
        },
      ],
      flags: [],
    },
  ],
  defaultVendor: { CE: "TP-Link Omada", HP: "TP-Link Omada" },
};

type Plan = EngineResult["plans"][number];

const asComplete = (p: Plan): Plan => ({
  ...p,
  complete: true,
  unmet: [],
  bom: { ...p.bom, totalIsPartial: false },
});

const [sampleCE, sampleHP] = engineSample.plans;

// Everything complete: Continue can be enabled.
const engineSampleComplete: EngineResult = {
  ...engineSample,
  plans: engineSample.plans.map(asComplete),
};

// Two vendors per tier, one complete and one incomplete, in opposite order for
// each tier. Switching a selected card to the incomplete vendor must clear the selection.
// "Ubiquiti UniFi" must be a valid VENDOR_NAMES entry.
const engineSampleMixed: EngineResult = {
  ...engineSample,
  plans: [
    asComplete(sampleCE),
    { ...sampleCE, vendor: "Ubiquiti UniFi" },
    sampleHP,
    { ...asComplete(sampleHP), vendor: "Ubiquiti UniFi" },
  ],
};

// Spread into `scenarios` in fixtures.ts:  { ...existing, ...engineScenarios }
export const engineScenarios: Record<string, VendorPlansPayload> = {
  engineSample: adaptEngineResult(engineSample).plansData,
  engineSampleComplete: adaptEngineResult(engineSampleComplete).plansData,
  engineSampleMixed: adaptEngineResult(engineSampleMixed).plansData,
};
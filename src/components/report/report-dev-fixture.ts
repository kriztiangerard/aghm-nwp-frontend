import type { EngineResult } from "@/types/api-types";
import type { QuestionnaireData } from "@/schemas/questionnaireSchema";

const generatedAt = "2026-11-14T09:00:00.000Z";
const priceUpdatedAt = "2026-11-14T00:00:00.000Z";

function bomLine(
  category: "gateway" | "access_point",
  sku: string,
  name: string,
  vendor: string,
  qty: number,
  unitPrice: number,
) {
  return {
    category,
    sku,
    name,
    vendor,
    qty,
    unitPrice,
    lineTotal: qty * unitPrice,
    status: "ACTIVE" as const,
    isGeneric: false,
    priceSource: "manual" as const,
    isStale: false,
    priceUpdatedAt,
  };
}

function topology(gatewayName: string, accessPointName: string) {
  return {
    nodes: [
      {
        id: "wan",
        role: "internet",
        layer: "wan",
        label: "Internet",
      },
      {
        id: "gateway",
        role: "gateway",
        layer: "gateway",
        label: gatewayName,
        qty: 1,
      },
      {
        id: "access-point",
        role: "wireless-access",
        layer: "access",
        label: accessPointName,
        qty: 2,
      },
    ],
    edges: [
      {
        id: "wan-gateway",
        source: "wan",
        target: "gateway",
        type: "uplink",
        medium: "fiber",
      },
      {
        id: "gateway-access",
        source: "gateway",
        target: "access-point",
        type: "downlink",
        medium: "copper",
        count: 2,
      },
    ],
  };
}

function makePlan(
  vendor: string,
  planType: "CE" | "HP",
  gateway: { sku: string; name: string; price: number },
  accessPoint?: { sku: string; name: string; price: number },
): EngineResult["plans"][number] {
  const lines = [
    bomLine(
      "gateway",
      gateway.sku,
      gateway.name,
      vendor,
      1,
      gateway.price,
    ),
    ...(accessPoint
      ? [
          bomLine(
            "access_point",
            accessPoint.sku,
            accessPoint.name,
            vendor,
            2,
            accessPoint.price,
          ),
        ]
      : []),
  ];

  const total = lines.reduce(
    (sum, line) => sum + (line.lineTotal ?? 0),
    0,
  );

  return {
    vendor,
    planType,
    complete: true,
    items: lines.map((line) => ({
      category: line.category,
      sku: line.sku,
      qty: line.qty,
    })),
    bom: {
      currency: "PHP",
      lines,
      total,
      totalIsPartial: false,
    },
    unmet: [],
    flags: [],
    ledger: [],
    topology: topology(
      gateway.name,
      accessPoint?.name ?? "Integrated wireless access",
    ),
    installationMaterials: {
      asOfDate: "2026-11-14",
      pricingBasis: "Illustrative representative prices for demo purposes",
      items: [
        {
          item: "Cat6 UTP Cable",
          description: "Horizontal network cabling for wired connections",
          unit: "meter",
          priceDisplay: "For estimation",
          priceReference: "Sample fixture",
        },
        {
          item: "RJ45 Connector",
          description: "Connector for Cat6 network cable termination",
          unit: "piece",
          priceDisplay: "For estimation",
          priceReference: "Sample fixture",
        },
        {
          item: "Cable Management",
          description: "Cable ties and basic cable organization materials",
          unit: "set",
          priceDisplay: "For estimation",
          priceReference: "Sample fixture",
        },
      ],
      note: "Illustrative mock data for report-page testing. These are not supplier quotations.",
    },
  };
}

export const reportDevEngineResult: EngineResult = {
  contractVersion: 3,
  generatedAt,
  requirements: {
    wireless: {
      standard: "Wi-Fi 6",
      ceiling: 30,
      CE: {
        total: 2,
        perFloor: [1, 1],
      },
      HP: {
        total: 2,
        perFloor: [1, 1],
      },
    },
    edgePorts: 20,
    poeEdgePorts: 4,
    requiredMbps: 500,
    throughputMetric: "routing_throughput",
    securityTier: "standard",
    vlans: ["Corporate", "Guest"],
    qos: false,
    redundancy: "none",
    backbone: "copper",
  },
  ledger: [
    {
      field: "wireless.standard",
      valueUsed: "Wi-Fi 6",
      reason: "Selected as the illustrative wireless standard for this demo.",
    },
  ],
  flags: [],
  plans: [
    makePlan(
      "TP-Link Omada",
      "CE",
      { sku: "ER605", name: "Omada ER605 Gateway", price: 3500 },
      { sku: "EAP610", name: "Omada EAP610 Access Point", price: 5200 },
    ),
    makePlan(
      "TP-Link Omada",
      "HP",
      { sku: "ER7206", name: "Omada ER7206 Gateway", price: 9800 },
      { sku: "EAP670", name: "Omada EAP670 Access Point", price: 8900 },
    ),
    makePlan(
      "Ubiquiti UniFi",
      "CE",
      { sku: "UDR", name: "UniFi Dream Router", price: 12000 },
    ),
    makePlan(
      "Ubiquiti UniFi",
      "HP",
      { sku: "UDM-Pro", name: "UniFi Dream Machine Pro", price: 23000 },
    ),
  ],
  defaultVendor: {
    CE: "TP-Link Omada",
    HP: "TP-Link Omada",
  },
};

export const reportDevQuestionnaireData: QuestionnaireData = {
  project: {
    name: "Demo Office Network",
    numberOfSites: "one",
    totalUsers: 60,
  },
  physicalSpace: {
    numberOfFloors: 2,
    floorAreaPerFloor: 250,
    roomsPerFloor: 5,
    largeGroupRooms: {
      hasLargeGroupRooms: false,
      rooms: [],
    },
  },
  existingNetwork: {
    equipmentStatus: "none",
    existingCabling: "none_or_not_sure",
  },
  internet: {
    currentSpeedMbps: 500,
    connectionType: "fiber",
    downtimeImpact: "same_day_matters",
  },
  devices: {
    wiredComputers: 20,
    wifiDevices: 40,
    voip: {
      enabled: false,
    },
    ipCameras: {
      enabled: false,
    },
    otherNetworkDevices: {
      enabled: false,
    },
  },
  preferences: {
    guestWifi: true,
    sensitiveData: "yes",
    applications: {
      videoConferencing: false,
      voipCalls: false,
      posPayment: false,
      cloudStorage: false,
      businessSoftware: false,
      videoStreaming: false,
      securityCameraViewing: false,
      basicBrowsingEmail: true,
      otherEnabled: false,
    },
    equipmentLocation: "wall_cabinet",
    managementPreference: "dashboard",
  },
  businessContext: {
    monthlyITBudget: "15000_40000",
    ITSupport: "external",
    electricityReliability: "stable",
    expectedGrowth: false,
  },
};

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import Comparison from "@/components/comparison/Comparison";
import { scenarios } from "@/components/comparison/fixtures";
import { SelectedPlanProvider } from "@/components/comparison/selected-plan-context";
import type { VendorName } from "@/components/comparison/types";

vi.mock("@/components/topology/topology-graph", () => ({
  TopologyGraph: () => <div data-testid="topology-diagram" />,
}));

vi.mock("@/components/comparison/vendorselect", () => ({
  VendorSelect: ({
    tier,
    selectedVendor,
    onVendorChange,
  }: {
    tier: string;
    selectedVendor: VendorName;
    onVendorChange: (vendor: VendorName) => void;
  }) => (
    <select
      aria-label={`Vendor for ${tier} plan`}
      value={selectedVendor}
      onChange={(event) =>
        onVendorChange(event.target.value as VendorName)
      }
    >
      <option value="TP-Link Omada">TP-Link Omada</option>
      <option value="Ubiquiti UniFi">Ubiquiti UniFi</option>
    </select>
  ),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("AC4 vendor switching uses loaded plans without backend requests", () => {
  const plans = scenarios.happy;

  if (!plans) {
    throw new Error("Happy fixture is missing.");
  }

  const originalPlans = JSON.stringify(plans);
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    {} as Response,
  );

  render(
    <SelectedPlanProvider>
      <Comparison
        plansData={plans}
        defaultVendors={{
          "Cost-Efficient": "TP-Link Omada",
          "High-Performance": "TP-Link Omada",
        }}
      />
    </SelectedPlanProvider>,
  );

  const cePanel = within(
    screen.getByRole("radio", { name: "Cost-Efficient Plan" }),
  );

  const hpPanel = within(
    screen.getByRole("radio", { name: "High-Performance Plan" }),
  );

  expect(cePanel.getByText("Omada Gigabit VPN Router")).toBeTruthy();
  expect(hpPanel.getByText("Omada Multi-Gigabit VPN Router")).toBeTruthy();

  fireEvent.change(
    cePanel.getByRole("combobox", {
      name: "Vendor for Cost-Efficient plan",
    }),
    { target: { value: "Ubiquiti UniFi" } },
  );

  expect(cePanel.getByText("UniFi Dream Router")).toBeTruthy();
  expect(hpPanel.getByText("Omada Multi-Gigabit VPN Router")).toBeTruthy();
  expect(fetchSpy).not.toHaveBeenCalled();

  fireEvent.change(
    hpPanel.getByRole("combobox", {
      name: "Vendor for High-Performance plan",
    }),
    { target: { value: "Ubiquiti UniFi" } },
  );

  expect(hpPanel.getByText("UniFi Dream Machine Pro")).toBeTruthy();
  expect(cePanel.getByText("UniFi Dream Router")).toBeTruthy();

  expect(fetchSpy).not.toHaveBeenCalled();
  expect(JSON.stringify(plans)).toBe(originalPlans);
});

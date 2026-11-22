import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import Comparison from "@/components/comparison/Comparison";
import { scenarios } from "@/components/comparison/fixtures";
import { SelectedPlanProvider } from "@/components/comparison/selected-plan-context";

vi.mock("@/components/topology/topology-graph", () => ({
  TopologyGraph: () => <div data-testid="topology-diagram" />,
}));

afterEach(cleanup);

test("AC5 hides topology and blocks report selection for an incomplete plan", () => {
  const vendor = "TP-Link Omada";
  const plans = scenarios.happy;
  const cePlan = plans?.[vendor]?.["Cost-Efficient"];
  const hpPlan = plans?.[vendor]?.["High-Performance"];

  if (!plans || !cePlan?.topology || !hpPlan?.complete || !hpPlan.topology) {
    throw new Error("Expected the happy fixture to contain CE and HP topologies.");
  }

  const unmetRequirement = "No gateway meets the required throughput.";

  render(
    <SelectedPlanProvider>
      <Comparison
        plansData={{
          ...plans,
          [vendor]: {
            ...plans[vendor],
            "Cost-Efficient": {
              ...cePlan,
              complete: false,
              unmet: [unmetRequirement],
            },
          },
        }}
        onContinue={vi.fn()}
      />
    </SelectedPlanProvider>,
  );

  const cePanel = within(
    screen.getByRole("radio", { name: "Cost-Efficient Plan" }),
  );
  const hpPanel = within(
    screen.getByRole("radio", { name: "High-Performance Plan" }),
  );

  expect(cePanel.getByRole("alert").textContent).toContain(unmetRequirement);
  expect(cePanel.queryByTestId("topology-diagram")).toBeNull();
  expect(
    cePanel.getByRole<HTMLButtonElement>("button", {
      name: "Select this plan",
    }).disabled,
  ).toBe(true);
  expect(
    screen.getByRole<HTMLButtonElement>("button", {
      name: "Continue to final report",
    }).disabled,
  ).toBe(true);

  expect(hpPanel.getByTestId("topology-diagram")).toBeTruthy();
  expect(
    hpPanel.getByRole<HTMLButtonElement>("button", {
      name: "Select this plan",
    }).disabled,
  ).toBe(false);
});
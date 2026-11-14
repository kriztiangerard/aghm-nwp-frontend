import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import InstallationMaterialsSummary from "@/components/report/InstallationMaterialsSummary";
import { PLANNING_STAGE_DISCLAIMER } from "@/lib/disclaimers";

afterEach(cleanup);

const materials = {
  asOfDate: "2026-11-14",
  pricingBasis: "Representative pricing",
  items: [
    {
      item: "Cat6 Cable",
      description: "Network cabling",
      unit: "meter",
      priceDisplay: "PHP 25.00",
    },
    {
      item: "Patch Cord",
      description: "Ethernet patch cable",
      unit: "piece",
      priceDisplay: "PHP 150.00",
    },
    {
      item: "RJ45 Connector",
      description: "Cable termination connector",
      unit: "piece",
      priceDisplay: "PHP 10.00",
    },
    {
      item: "SFP Module",
      description: "Fiber transceiver",
      unit: "piece",
      priceDisplay: "PHP 1,200.00",
    },
    {
      item: "Patch Panel",
      description: "Network patch panel",
      unit: "piece",
      priceDisplay: "PHP 2,500.00",
    },
  ],
};

describe("InstallationMaterialsSummary", () => {
  it("AC 9: displays the required materials and representative unit prices", () => {
    render(<InstallationMaterialsSummary materials={materials} />);

    for (const name of [
      "Cat6 Cable",
      "Patch Cord",
      "RJ45 Connector",
      "SFP Module",
      "Patch Panel",
    ]) {
      expect(screen.getByText(name)).toBeTruthy();
    }

    expect(screen.getByText("PHP 25.00")).toBeTruthy();
    expect(screen.getByText("PHP 2,500.00")).toBeTruthy();
    expect(screen.getByText("Representative unit price")).toBeTruthy();
    expect(screen.getByText(PLANNING_STAGE_DISCLAIMER)).toBeTruthy();
  });

  it("AC 11: displays the shared mandatory disclaimer when note is absent", () => {
    render(<InstallationMaterialsSummary materials={materials} />);

    expect(screen.getByText(PLANNING_STAGE_DISCLAIMER)).toBeTruthy();
  });

  it("AC 11: retains the supplied note and shared disclaimer", () => {
    render(
      <InstallationMaterialsSummary
        materials={{ ...materials, note: "Illustrative prices only." }}
      />,
    );

    expect(screen.getByText("Illustrative prices only.")).toBeTruthy();
    expect(screen.getByText(PLANNING_STAGE_DISCLAIMER)).toBeTruthy();
  });

  it("AC 12: never displays quantities or line totals", () => {
    render(
      <InstallationMaterialsSummary
        materials={{
          ...materials,
          items: [
            {
              item: "Cat6 Cable",
              unit: "meter",
              representativeUnitPrice: 25,
              qty: 999,
              lineTotal: 24975,
            },
          ],
        }}
      />,
    );

    const headers = screen.getAllByRole("columnheader").map(
      (header) => header.textContent,
    );

    expect(headers).not.toContain("Quantity");
    expect(headers).not.toContain("Qty");
    expect(headers).not.toContain("Line total");
    expect(headers).not.toContain("Total");

    expect(screen.queryByText("999")).toBeNull();
    expect(screen.queryByText("24975")).toBeNull();
    expect(screen.getByText("25")).toBeTruthy();
  });

  it("AC 11: displays the mandatory disclaimer even when materials are missing", () => {
    render(<InstallationMaterialsSummary materials={null} />);

    expect(
      screen.getByText("No installation materials summary was provided for this plan."),
    ).toBeTruthy();
    expect(screen.getByText(PLANNING_STAGE_DISCLAIMER)).toBeTruthy();
  });

  it("AC 9 and 12: shows price on request for unpriced SFP modules without quantities", () => {
    render(
      <InstallationMaterialsSummary
        materials={{
          currency: "PHP",
          items: [
            {
              item: "sfp_modules",
              description: "SFP modules for fiber uplinks",
              unit: "module",
              links: 2,
              modules: 4,
              formFactor: "SFP",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("sfp_modules")).toBeTruthy();
    expect(screen.getByText("Price on request")).toBeTruthy();

    const headers = screen.getAllByRole("columnheader").map(
      (header) => header.textContent,
    );

    expect(headers).not.toContain("Quantity");
    expect(headers).not.toContain("Line total");
    expect(headers).not.toContain("Total");

    expect(screen.queryByText("2")).toBeNull();
    expect(screen.queryByText("4")).toBeNull();
  });

  it("renders safe source links in a new tab", () => {
    render(
      <InstallationMaterialsSummary
        materials={{
          items: [{
            item: "Cat6 Cable",
            sourceUrl: "https://example.com/cat6",
          }],
        }}
      />,
    );

    const link = screen.getByRole("link", { name: "View source" });
    expect(link.getAttribute("href")).toBe("https://example.com/cat6");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});

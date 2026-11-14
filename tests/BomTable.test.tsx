import { afterEach, describe, expect, it } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
import { render, screen, within } from "@testing-library/react";
import BomTable from "../src/components/report/BomTable";
import type { ReportViewModel } from "../src/lib/report/report-view-model";

type Bom = ReportViewModel["bom"];

const mockBom: Bom = {
  currency: "PHP",
  lines: [
    {
      category: "gateway",
      sku: "ER605",
      name: "Omada ER605 Gateway",
      vendor: "TP-Link Omada",
      qty: 2,
      unitPrice: 3500,
      lineTotal: 7000,
      status: "ACTIVE",
      isGeneric: false,
      priceSource: "manual",
      isStale: false,
      priceUpdatedAt: "2026-11-14",
    },
  ],
  total: 7000,
  totalIsPartial: false,
};

describe("NWP-REPORT-003: BomTable", () => {
  it("AC 1: displays required fields and estimated total in BOM currency", () => {
    render(<BomTable bom={mockBom} />);

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    const itemRow = rows[1];

    expect(within(itemRow).getByText("Gateway")).toBeTruthy();
    expect(within(itemRow).getByText("Omada ER605 Gateway")).toBeTruthy();
    expect(within(itemRow).getByText("ER605")).toBeTruthy();
    expect(within(itemRow).getByText("TP-Link Omada")).toBeTruthy();
    expect(within(itemRow).getByText("2")).toBeTruthy();

    expect(
      within(itemRow).getByText("PHP 3,500.00")
    ).toBeTruthy();

    expect(
      within(itemRow).getByText("PHP 7,000.00")
    ).toBeTruthy();

    expect(
      within(table).getByText("Estimated total")
    ).toBeTruthy();

    const footer = table.querySelector("tfoot");

    expect(footer).not.toBeNull();
    expect(
      within(footer!).getByText("PHP 7,000.00")
    ).toBeTruthy();
  });

  it("AC 4: shows a stale price badge and last verified date", () => {
    const staleBom: Bom = {
      ...mockBom,
      lines: [
        {
          ...mockBom.lines[0],
          isStale: true,
          priceUpdatedAt: "2026-11-10",
        },
      ],
    };

    render(<BomTable bom={staleBom} />);

    expect(screen.getByText("Stale")).toBeTruthy();
    expect(screen.queryByText(/Last verified:/)).toBeNull();
  });

  it("AC 4: does not show stale price information for current prices", () => {
    render(<BomTable bom={mockBom} />);

    expect(screen.queryByText("Stale")).toBeNull();
    expect(screen.queryByText(/Last verified:/)).toBeNull();
  });

  it("AC 5: displays Automatically synchronized for synchronized prices", () => {
    const bom: Bom = {
      ...mockBom,
      lines: [{ ...mockBom.lines[0], priceSource: "synchronized" }],
    };

    render(<BomTable bom={bom} />);

    expect(screen.getByText("Synced")).toBeTruthy();
    expect(screen.queryByText("Manual")).toBeNull();
  });

  it("AC 5: displays Manually verified for manual prices", () => {
    render(<BomTable bom={mockBom} />);

    expect(screen.getByText("Manual")).toBeTruthy();
    expect(screen.queryByText("Synced")).toBeNull();
  });

  it("AC 5: does not guess a price source when absent", () => {
    const bom: Bom = {
      ...mockBom,
      lines: [{ ...mockBom.lines[0], priceSource: undefined }],
    };

    render(<BomTable bom={bom} />);

    expect(screen.queryByText("Synced")).toBeNull();
    expect(screen.queryByText("Manual")).toBeNull();
  });

  it("AC 6: warns users to confirm availability for sunsetting equipment", () => {
    const bom: Bom = {
      ...mockBom,
      lines: [{ ...mockBom.lines[0], status: "SUNSETTING" }],
    };

    render(<BomTable bom={bom} />);

    expect(screen.getByText("Sunsetting")).toBeTruthy();
    expect(
      screen.queryByText("Confirm availability before purchase.")
    ).toBeNull();
  });

  it("AC 6: does not show a sunsetting notice for active equipment", () => {
    render(<BomTable bom={mockBom} />);

    expect(screen.queryByText("Sunsetting")).toBeNull();
    expect(
      screen.queryByText("Confirm availability before purchase.")
    ).toBeNull();
  });

  it("AC 7: labels generic enclosures without claiming a vendor model", () => {
    const bom: Bom = {
      ...mockBom,
      lines: [
        {
          ...mockBom.lines[0],
          isGeneric: true,
          name: "Example Vendor Rack Model",
          vendor: "Example Vendor",
        },
      ],
    };

    render(<BomTable bom={bom} />);

    expect(screen.getAllByText("Generic enclosure").length).toBeGreaterThan(0);
    expect(screen.getByText("Not specified")).toBeTruthy();
    expect(screen.queryByText("Example Vendor Rack Model")).toBeNull();
    expect(screen.queryByText("Example Vendor")).toBeNull();
  });

  it("AC 7: preserves product names and vendors for non-generic equipment", () => {
    render(<BomTable bom={mockBom} />);

    expect(screen.getByText("Omada ER605 Gateway")).toBeTruthy();
    expect(screen.getByText("TP-Link Omada")).toBeTruthy();
    expect(screen.queryByText("Generic enclosure")).toBeNull();
  });

  it("AC 13: displays firewall as Firewall", () => {
    const bom: Bom = {
      ...mockBom,
      lines: [{ ...mockBom.lines[0], category: "firewall" }],
    };

    render(<BomTable bom={bom} />);

    expect(screen.getByText("Firewall")).toBeTruthy();
  });

  it("AC 13: title-cases unknown categories without crashing", () => {
    const bom: Bom = {
      ...mockBom,
      lines: [{ ...mockBom.lines[0], category: "custom_network_device" }],
    };

    render(<BomTable bom={bom} />);

    expect(screen.getByText("Custom Network Device")).toBeTruthy();
  });

  it("AC 2: shows Price on request and partial total for an unpriced item", () => {
    const bom: Bom = {
      ...mockBom,
      lines: [
        {
          ...mockBom.lines[0],
          unitPrice: null,
          lineTotal: null,
        },
      ],
      total: 0,
      totalIsPartial: false,
    };

    render(<BomTable bom={bom} />);

    const table = screen.getByRole("table");
    const itemRow = within(table).getAllByRole("row")[1];

    expect(
      within(itemRow).getAllByText("Price on request")
    ).toHaveLength(2);

    expect(screen.getByText("Partial total")).toBeTruthy();
  });

  it("AC 3: labels the total partial when totalIsPartial is true", () => {
    const bom: Bom = {
      ...mockBom,
      totalIsPartial: true,
    };

    render(<BomTable bom={bom} />);

    expect(screen.getByText("Partial total")).toBeTruthy();
    expect(
      screen.getByText("Excludes items with unavailable prices. Final equipment cost may be higher.")
    ).toBeTruthy();

    expect(screen.queryByText("Estimated total")).toBeNull();
  });

  it("AC 3: keeps Estimated total for a complete, fully priced BOM", () => {
    render(<BomTable bom={mockBom} />);

    expect(screen.getByText("Estimated total")).toBeTruthy();
    expect(screen.queryByText("Partial total")).toBeNull();
  });

  it("AC 10: displays numbered safe price reference links", () => {
    const bom: Bom = {
      ...mockBom,
      lines: [{
        ...mockBom.lines[0],
        priceReferences: [
          "https://example.com/price-one",
          "http://example.com/price-two",
        ],
      }],
    };

    render(<BomTable bom={bom} />);

    const reference1 = screen.getByRole("link", { name: "Reference 1" });
    const reference2 = screen.getByRole("link", { name: "Reference 2" });

    expect(reference1.getAttribute("href")).toBe("https://example.com/price-one");
    expect(reference2.getAttribute("href")).toBe("http://example.com/price-two");

    for (const link of [reference1, reference2]) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("AC 10: excludes unsafe and invalid URLs", () => {
    const bom: Bom = {
      ...mockBom,
      lines: [{
        ...mockBom.lines[0],
        priceReferences: [
          "javascript:alert(1)",
          "not-a-url",
          "https://example.com/valid",
          "ftp://example.com/file",
        ],
      }],
    };

    render(<BomTable bom={bom} />);

    const links = screen.getAllByRole("link");

    expect(links).toHaveLength(1);
    expect(links[0].textContent).toBe("Reference 1");
    expect(links[0].getAttribute("href")).toBe("https://example.com/valid");
  });

  it("AC 10: displays no reference links when references are absent", () => {
    render(<BomTable bom={mockBom} />);

    expect(screen.queryByRole("link")).toBeNull();
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import BomStatusLegend from "../src/components/report/BomStatusLegend";

afterEach(() => cleanup());

describe("NWP-REPORT-003: BOM status legend", () => {
  it("displays status explanations when the info icon is hovered", () => {
    render(<BomStatusLegend />);

    const infoButton = screen.getByRole("button", {
      name: "BOM status legend",
    });

    expect(screen.queryByText("Device approaching end-of-life. Check availability before buying.")).toBeNull();

    fireEvent.mouseEnter(infoButton.parentElement!);

    expect(screen.getByText("Legend")).toBeTruthy();
    expect(screen.getByText("Price sourced from distributor")).toBeTruthy();
    expect(screen.getByText("Price entered manually")).toBeTruthy();
    expect(screen.getByText("Generic component")).toBeTruthy();
    expect(screen.getByText("Price may be out of date")).toBeTruthy();
    expect(screen.getByText("Device approaching end-of-life. Check availability before buying.")).toBeTruthy();

    fireEvent.mouseLeave(infoButton.parentElement!);

    expect(screen.queryByText("Device approaching end-of-life. Check availability before buying.")).toBeNull();
  });

  it("opens the legend when the info icon is clicked", () => {
    render(<BomStatusLegend />);

    const infoButton = screen.getByRole("button", {
      name: "BOM status legend",
    });

    fireEvent.click(infoButton);

    expect(screen.getByText("Device approaching end-of-life. Check availability before buying.")).toBeTruthy();
    expect(infoButton.getAttribute("aria-expanded")).toBe("true");
  });
});

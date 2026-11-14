// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DisclaimerAlert } from "../src/components/report/DisclaimerAlert";
import {
  DISCLAIMER_TITLE,
  PLANNING_STAGE_DISCLAIMER,
  PRICING_DISCLAIMER,
  getDisclaimerBlock,
} from "../src/lib/disclaimers";

const GENERATED_AT = "2026-11-13T07:04:05.000Z";

afterEach(cleanup);

describe("DisclaimerAlert (AC2, AC3, AC4)", () => {
  it("renders inside an Alert", () => {
    render(<DisclaimerAlert generatedAt={GENERATED_AT} />);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("shows the shared title, both paragraphs and the generated-at line as plain text", () => {
    render(<DisclaimerAlert generatedAt={GENERATED_AT} />);
    expect(screen.getByText(DISCLAIMER_TITLE)).toBeTruthy();
    expect(screen.getByText(PRICING_DISCLAIMER)).toBeTruthy();
    expect(screen.getByText(PLANNING_STAGE_DISCLAIMER)).toBeTruthy();
    expect(screen.getByText(getDisclaimerBlock(GENERATED_AT).generatedAtLine)).toBeTruthy();
  });

  it("is not hidden behind a link, button or tooltip", () => {
    render(<DisclaimerAlert generatedAt={GENERATED_AT} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows the timestamp it was given", () => {
    const { rerender } = render(<DisclaimerAlert generatedAt={GENERATED_AT} />);
    const other = "2026-11-14T09:30:00.000Z";
    rerender(<DisclaimerAlert generatedAt={other} />);
    expect(screen.getByText(getDisclaimerBlock(other).generatedAtLine)).toBeTruthy();
    expect(screen.queryByText(getDisclaimerBlock(GENERATED_AT).generatedAtLine)).toBeNull();
  });
});
/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ParticipantRoster } from "@/components/collections/participant-roster";

const rosterItems = Array.from({ length: 30 }, (_, index) => ({
  id: `elector-${index + 1}`,
  label: "운영팀",
  name: `선거인 ${index + 1}`,
  participated: false,
  participatedAt: null,
}));

describe("ParticipantRoster", () => {
  afterEach(cleanup);

  it("renders a bounded page with semantic table metadata", () => {
    render(
      <ParticipantRoster
        title="선거인명부"
        items={rosterItems}
        page={1}
        pageSize={25}
        onPageChange={() => undefined}
      />,
    );

    expect(screen.getAllByRole("row")).toHaveLength(26);
    expect(screen.getByText("1-25 / 30명")).toBeTruthy();
    expect(screen.getByRole("region", { name: "선거인명부 표" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "이름" })).toBeTruthy();
  });

  it("requests the next controlled page", () => {
    const onPageChange = vi.fn();
    render(
      <ParticipantRoster
        title="선거인명부"
        items={rosterItems}
        page={1}
        pageSize={25}
        onPageChange={onPageChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

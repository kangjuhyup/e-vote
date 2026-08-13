import { describe, expect, it } from "vitest";

import { formatKoreanDateTime } from "./date-format";

describe("formatKoreanDateTime", () => {
  it("formats timestamps with the application timezone", () => {
    expect(formatKoreanDateTime("2026-08-10T09:00:00.000Z")).toBe(
      "2026. 8. 10. 18:00",
    );
  });
});

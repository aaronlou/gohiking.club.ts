import { describe, expect, it } from "vitest";
import {
  activityPhase,
  formatActivityRange,
  formatActivityRangeNumeric,
  groupActivityPhotosByDay,
} from "./activities";

describe("activity dates", () => {
  it("formats a single-day and a multi-day range", () => {
    expect(formatActivityRange("2026-09-20", null)).toBe("9月20日");
    expect(formatActivityRange("2026-09-20", "2026-09-21")).toBe("9月20日 — 9月21日");
    expect(formatActivityRangeNumeric("2026-09-20", "2026-09-21")).toBe("09.20 — 09.21");
  });

  it("derives the phase from dates and status", () => {
    expect(activityPhase({ startDate: "2020-01-01", endDate: "2020-01-02", status: "open" })).toBe("past");
    expect(activityPhase({ startDate: "2999-01-01", endDate: null, status: "open" })).toBe("upcoming");
    expect(activityPhase({ startDate: "2020-01-01", endDate: "2999-01-01", status: "open" })).toBe("ongoing");
    expect(activityPhase({ startDate: "2999-01-01", endDate: null, status: "closed" })).toBe("closed");
  });
});

describe("groupActivityPhotosByDay", () => {
  it("groups photos by their Shanghai calendar day", () => {
    const groups = groupActivityPhotosByDay([
      { takenAt: "2026-09-20T23:30:00.000Z", createdAt: "2026-09-20T23:30:00.000Z" },
      { takenAt: "2026-09-21T01:00:00.000Z", createdAt: "2026-09-21T01:00:00.000Z" },
      { takenAt: null, createdAt: "2026-09-20T02:00:00.000Z" },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].label).toContain("9月21日");
    expect(groups[0].photos).toHaveLength(2);
    expect(groups[1].photos).toHaveLength(1);
  });
});

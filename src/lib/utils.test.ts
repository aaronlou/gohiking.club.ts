import { describe, expect, it } from "vitest";
import { formatScore, initials, safeNextPath, scoreVerdict } from "./utils";

describe("formatScore", () => {
  it("formats numeric database values", () => {
    expect(formatScore("4.7")).toBe("4.7");
    expect(formatScore(3)).toBe("3.0");
    expect(formatScore(null)).toBe("—");
  });
});

describe("safeNextPath", () => {
  it("allows local paths", () => {
    expect(safeNextPath("/studio/upload")).toBe("/studio/upload");
  });

  it("blocks open redirects", () => {
    expect(safeNextPath("//evil.example")).toBe("/studio");
    expect(safeNextPath("https://evil.example")).toBe("/studio");
    expect(safeNextPath(null)).toBe("/studio");
  });
});

describe("labels", () => {
  it("derives initials for Chinese and Latin names", () => {
    expect(initials("林深")).toBe("林深");
    expect(initials("Mira Chen")).toBe("MC");
  });

  it("maps score verdicts around the 3.0 threshold", () => {
    expect(scoreVerdict(2.9)).toBe("未入选");
    expect(scoreVerdict(3)).toBe("入选档案");
    expect(scoreVerdict(4.6)).toBe("编辑精选");
  });
});

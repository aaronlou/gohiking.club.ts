import { describe, expect, it } from "vitest";
import { extractJsonObject, normalizeEvaluation } from "./schema";

const base = {
  score: 4.6,
  summary: "光线从林间穿过，画面保留了真实的湿度与安静的现场感。",
  strengths: ["01 林间高光有节奏", "暗部仍然可读", "空气感诚实"],
  improvements: ["天空稍亮"],
  tags: ["#雾林", "逆光", "苔藓"],
  theme: "forest" as const,
  medium: "photograph" as const,
  hasOutdoorContext: true,
};

describe("normalizeEvaluation", () => {
  it("keeps an ordinary outdoor photograph within range", () => {
    const result = normalizeEvaluation(base);
    expect(result.score).toBe(4.6);
    expect(result.tags).toEqual(["雾林", "逆光", "苔藓"]);
  });

  it("hard-caps screenshots regardless of the model's aesthetic score", () => {
    const result = normalizeEvaluation({
      ...base,
      score: 4.9,
      medium: "screenshot",
      hasOutdoorContext: false,
    });
    expect(result.score).toBe(1.8);
    expect(result.summary).toContain("屏幕界面");
    expect(result.tags).toContain("截图");
  });

  it("hard-caps photographs without outdoor context at 2.9", () => {
    const result = normalizeEvaluation({
      ...base,
      score: 4.8,
      hasOutdoorContext: false,
    });
    expect(result.score).toBe(2.9);
  });

  it("clamps and rounds scores, and removes duplicate/empty list items", () => {
    const result = normalizeEvaluation({
      ...base,
      score: 9,
      strengths: ["好", "好", "  ", "02 具体的理由"],
      tags: ["#HDR", "#HDR"],
    });
    expect(result.score).toBe(5);
    expect(result.strengths).toEqual(["具体的理由"]);
    expect(result.tags).toEqual(["HDR"]);
  });

  it("does not round a sub-threshold score over 3.0", () => {
    const result = normalizeEvaluation({ ...base, score: 2.96 });
    expect(result.score).toBe(2.9);
  });

  it("provides a reason even when the model returns no strengths", () => {
    const result = normalizeEvaluation({ ...base, score: 3.7, strengths: [] });
    expect(result.strengths.length).toBeGreaterThan(0);
  });

  it("keeps rejection reasons empty when the photo did not qualify", () => {
    const result = normalizeEvaluation({ ...base, score: 2.2, strengths: [] });
    expect(result.score).toBe(2.2);
    expect(result.strengths).toEqual([]);
  });
});

describe("extractJsonObject", () => {
  it("parses fenced JSON", () => {
    expect(extractJsonObject('```json\n{"score": 3.5}\n```')).toEqual({ score: 3.5 });
  });

  it("finds an object inside prose", () => {
    expect(extractJsonObject('结果为：{"score": 4.1} 希望有帮助')).toEqual({ score: 4.1 });
  });

  it("throws when no JSON object exists", () => {
    expect(() => extractJsonObject("not json")).toThrow();
  });
});

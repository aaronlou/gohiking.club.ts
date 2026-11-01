import { z } from "zod";
import { PHOTO_THEME_IDS, type PhotoThemeId } from "@/lib/constants";

const themeEnum = z.enum(PHOTO_THEME_IDS as [PhotoThemeId, ...PhotoThemeId[]]);

export const rawEvaluationSchema = z.object({
  score: z.coerce.number().min(1).max(5),
  medium: z
    .enum(["photograph", "screenshot", "document", "illustration", "other"])
    .optional()
    .default("photograph"),
  hasOutdoorContext: z.coerce.boolean().optional().default(true),
  summary: z.coerce.string().min(8).max(1200),
  strengths: z.array(z.coerce.string()).max(8).optional().default([]),
  improvements: z.array(z.coerce.string()).max(8).optional().default([]),
  tags: z.array(z.coerce.string()).max(12).optional().default([]),
  theme: themeEnum.optional().default("trail"),
});

export type RawEvaluation = z.infer<typeof rawEvaluationSchema>;

export type PhotoEvaluation = {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  tags: string[];
  theme: PhotoThemeId;
};

function tidyList(values: string[], maxItems: number, maxLength: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw
      .replace(/^[\s\-–—•·\d.、）)]+/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
    if (value.length < 2 || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
    if (result.length >= maxItems) break;
  }
  return result;
}

export function normalizeEvaluation(raw: RawEvaluation): PhotoEvaluation {
  const isScreenshot = raw.medium !== "photograph";
  const lacksOutdoorContext = !raw.hasOutdoorContext;
  let score = Math.round(Math.min(5, Math.max(1, raw.score)) * 10) / 10;

  // Hard screening rules. These cannot be overridden by an aesthetic opinion.
  if (isScreenshot) score = Math.min(score, 1.8);
  else if (lacksOutdoorContext) score = Math.min(score, 2.9);

  // Never let one-decimal rounding push a sub-3.0 photo over the admission line.
  if (raw.score < 3 && score >= 3) score = 2.9;

  let summary = raw.summary.replace(/\s+/g, " ").trim().slice(0, 600);
  let strengths = tidyList(raw.strengths, 4, 160);
  let improvements = tidyList(raw.improvements, 4, 160);
  let tags = tidyList(raw.tags, 6, 24).map((tag) => tag.replace(/^#/, ""));

  if (isScreenshot) {
    const isUi = raw.medium === "screenshot";
    summary = isUi
      ? "这张看起来更像一张屏幕界面，而不是在山里按下快门得到的照片。界面、文字和控件都很清楚，只是它们属于一次页面记录。即使画面里嵌着一张风景照，这次也先不把它当作现场影像收进来。"
      : "这张更像文档、插画、测试图或其它非现场生成的图像。它清楚地传达了一些信息，只是缺少真实徒步现场的光线与时间。等你有了一张在山里拍下的照片，我们很愿意再看看。";
    strengths = [
      isUi
        ? "界面与文字都清晰可辨，截图本身没有明显的压缩损坏。"
        : "画面信息清楚，也让人能够理解它为何不是一张现场照片。",
    ];
    improvements = [
      isUi
        ? "下次可以试试直接上传相机或手机拍下的原始照片，而不是网页、App、聊天窗口或系统界面。"
        : "下次可以试试上传一张你本人在山野现场拍下的照片，而不是文档、插画、测试图或生成图像。",
      "如果只是想分享某个页面，保留链接就好；山行档案更想收藏真实的现场。",
    ];
    tags = [isUi ? "截图" : "非现场图像", "界面", "非现场影像"];
  }

  return {
    score,
    summary,
    strengths:
      strengths.length > 0
        ? strengths
        : score >= 3
          ? ["画面保留了完整的山野现场感，情绪是诚实的。"]
          : [],
    improvements,
    tags,
    theme: raw.theme,
  };
}

export function extractJsonObject(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("模型没有返回可解析的 JSON");
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

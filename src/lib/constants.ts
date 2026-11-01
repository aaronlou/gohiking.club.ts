export const SITE = {
  name: "山行档案",
  latin: "GOHIKING.CLUB",
  tagline: "只留下值得背下山的照片",
  description:
    "为户外徒步者建立的影像档案馆。每一张照片都经过多模态 AI 的认真观看，只留下 3 分以上的山野影像。",
  url: process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000",
} as const;

export const SCORE_THRESHOLD = 3;

export const PHOTO_THEMES = [
  {
    id: "ridge",
    label: "山脊",
    latin: "RIDGE",
    note: "山体、天际线与攀登的尺度",
    color: "#8f6d4c",
  },
  {
    id: "forest",
    label: "林间",
    latin: "WOODS",
    note: "树影、苔藓与潮湿的呼吸",
    color: "#445c43",
  },
  {
    id: "water",
    label: "水岸",
    latin: "WATER",
    note: "溪流、湖泊与倒影",
    color: "#486f76",
  },
  {
    id: "snow",
    label: "雪线",
    latin: "SNOWLINE",
    note: "雪、冰与寒冷中的光",
    color: "#83999c",
  },
  {
    id: "night",
    label: "星野",
    latin: "NIGHT",
    note: "银河、帐篷与夜行的头灯",
    color: "#3e455e",
  },
  {
    id: "trail",
    label: "路径",
    latin: "TRAIL",
    note: "小径、石阶与通往远处的路",
    color: "#9a7a4e",
  },
  {
    id: "company",
    label: "同行",
    latin: "COMPANY",
    note: "人、背影与一起走过的路",
    color: "#a6583e",
  },
  {
    id: "wild",
    label: "荒野",
    latin: "WILDLANDS",
    note: "草甸、戈壁与无人抵达之处",
    color: "#7d7445",
  },
] as const;

export type PhotoThemeId = (typeof PHOTO_THEMES)[number]["id"];

export const PHOTO_THEME_IDS = PHOTO_THEMES.map((theme) => theme.id);

export function getTheme(id: string) {
  return PHOTO_THEMES.find((theme) => theme.id === id) ?? PHOTO_THEMES[5];
}

export const SCORE_RUBRIC = [
  {
    index: "01",
    title: "光与色",
    latin: "LIGHT",
    description: "曝光是否服务于画面，色彩是否克制而准确。",
  },
  {
    index: "02",
    title: "构图与层次",
    latin: "COMPOSITION",
    description: "视线是否有落脚点，前中远景是否形成呼吸。",
  },
  {
    index: "03",
    title: "山野叙事",
    latin: "NARRATIVE",
    description: "它是否真的发生在山里，是否留下一个可进入的瞬间。",
  },
  {
    index: "04",
    title: "独特观看",
    latin: "VISION",
    description: "是否避开了明信片式的重复，拥有拍摄者自己的眼睛。",
  },
] as const;

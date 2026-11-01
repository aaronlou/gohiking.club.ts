export type CameraBodyPreset = {
  id: string;
  name: string;
  latin: string;
  body: string;
  top: string;
  grip: string;
  accent: string;
};

export type CameraLensPreset = {
  id: string;
  name: string;
  latin: string;
  focal: string;
  aperture: string;
  note: string;
};

export type FilmPreset = {
  id: string;
  name: string;
  latin: string;
  note: string;
  css: string;
  swatch: [string, string, string];
};

export type StrapPreset = {
  id: string;
  name: string;
  color: string;
  texture: string;
};

export const CAMERA_BODIES: CameraBodyPreset[] = [
  {
    id: "moss",
    name: "苔原绿",
    latin: "MOSS",
    body: "#3c4a3a",
    top: "#b9b5a7",
    grip: "#283128",
    accent: "#e96b40",
  },
  {
    id: "obsidian",
    name: "曜石黑",
    latin: "OBSIDIAN",
    body: "#1d1f1b",
    top: "#9a9a8f",
    grip: "#10110f",
    accent: "#d8c6a4",
  },
  {
    id: "bone",
    name: "骨白",
    latin: "BONE",
    body: "#d7d0bf",
    top: "#ece7db",
    grip: "#9d947f",
    accent: "#b34c2d",
  },
  {
    id: "rust",
    name: "铁锈橙",
    latin: "RUST",
    body: "#a74b30",
    top: "#c9c4b5",
    grip: "#71301f",
    accent: "#f0e1c2",
  },
  {
    id: "glacier",
    name: "冰川灰",
    latin: "GLACIER",
    body: "#91a5a0",
    top: "#d8ddda",
    grip: "#5d706b",
    accent: "#e5bb5c",
  },
];

export const CAMERA_LENSES: CameraLensPreset[] = [
  {
    id: "wide-24",
    name: "旷野 24",
    latin: "WILD 24",
    focal: "24 mm",
    aperture: "f/2.8",
    note: "把整条山脊装进画面",
  },
  {
    id: "field-35",
    name: "山径 35",
    latin: "FIELD 35",
    focal: "35 mm",
    aperture: "f/2.0",
    note: "像眼睛一样自然的观看",
  },
  {
    id: "portrait-50",
    name: "同行 50",
    latin: "FELLOW 50",
    focal: "50 mm",
    aperture: "f/1.8",
    note: "把人和山放在恰当的距离",
  },
];

export const FILM_STOCKS: FilmPreset[] = [
  {
    id: "pine-400",
    name: "松针 400",
    latin: "PINE 400",
    note: "偏青的暗部，潮湿的森林感",
    css: "saturate(0.88) contrast(1.04) sepia(0.08) hue-rotate(-6deg)",
    swatch: ["#1d2b21", "#61755a", "#d4bd8f"],
  },
  {
    id: "granite-100",
    name: "花岗岩 100",
    latin: "GRANITE 100",
    note: "干净、克制，岩石本身的颜色",
    css: "saturate(0.76) contrast(1.08) brightness(1.02)",
    swatch: ["#262824", "#888a7f", "#ddd5c2"],
  },
  {
    id: "dusk-800",
    name: "暮色 800",
    latin: "DUSK 800",
    note: "偏暖的高光，适合收队时分",
    css: "saturate(1.06) contrast(1.02) sepia(0.16) hue-rotate(-8deg) brightness(0.99)",
    swatch: ["#2a1e1a", "#a76743", "#e9c894"],
  },
  {
    id: "alpine-200",
    name: "高山 200",
    latin: "ALPINE 200",
    note: "清冷、通透，像雪线以上的空气",
    css: "saturate(0.82) contrast(1.05) brightness(1.04) hue-rotate(5deg)",
    swatch: ["#1e2a31", "#6f8992", "#e0e5de"],
  },
  {
    id: "mono-400",
    name: "山影 400",
    latin: "SHADOW 400",
    note: "去掉颜色，只留下形状与光",
    css: "grayscale(1) contrast(1.14) brightness(1.02)",
    swatch: ["#171816", "#77766e", "#e8e3d6"],
  },
];

export const STRAPS: StrapPreset[] = [
  { id: "canvas", name: "军绿帆布", color: "#5d6249", texture: "canvas" },
  { id: "leather", name: "焦糖皮革", color: "#8b5a38", texture: "leather" },
  { id: "cord", name: "信号橙绳", color: "#d95f38", texture: "cord" },
];

export function getBody(id: string) {
  return CAMERA_BODIES.find((body) => body.id === id) ?? CAMERA_BODIES[0];
}

export function getLens(id: string) {
  return CAMERA_LENSES.find((lens) => lens.id === id) ?? CAMERA_LENSES[1];
}

export function getFilm(id: string) {
  return FILM_STOCKS.find((film) => film.id === id) ?? FILM_STOCKS[0];
}

export function getStrap(id: string) {
  return STRAPS.find((strap) => strap.id === id) ?? STRAPS[0];
}

export function makeCameraSerial() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let index = 0; index < 5; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `GH·${new Date().getFullYear().toString().slice(-2)}·${suffix}`;
}

export function cameraFilter(filmId: string) {
  return getFilm(filmId).css;
}

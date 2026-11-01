import { desc, eq } from "drizzle-orm";
import { getBody, getFilm, getLens, getStrap, makeCameraSerial } from "@/lib/camera-presets";
import type { CameraDesignInput } from "@/lib/validation";
import { db } from "@/server/db";
import { cameras, user } from "@/server/db/schema";

export type CameraDto = {
  id: string;
  name: string;
  serial: string;
  bodyColor: string;
  accentColor: string;
  lens: string;
  filmStock: string;
  strap: string;
  engraving: string | null;
  createdAt: string;
};

export function toCameraDto(camera: typeof cameras.$inferSelect): CameraDto {
  return {
    id: camera.id,
    name: camera.name,
    serial: camera.serial,
    bodyColor: camera.bodyColor,
    accentColor: camera.accentColor,
    lens: camera.lens,
    filmStock: camera.filmStock,
    strap: camera.strap,
    engraving: camera.engraving,
    createdAt: camera.createdAt.toISOString(),
  };
}

export async function createCamera(userId: string, design: CameraDesignInput) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const serial = makeCameraSerial();
    try {
      const [camera] = await db
        .insert(cameras)
        .values({
          userId,
          name: design.name,
          serial,
          bodyColor: design.bodyColor,
          accentColor: design.accentColor,
          lens: design.lens,
          filmStock: design.filmStock,
          strap: design.strap,
          engraving: design.engraving || null,
        })
        .returning();
      if (camera) return toCameraDto(camera);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "23505") throw error;
    }
  }
  throw new Error("无法生成唯一相机序列号");
}

export async function getLatestCamera(userId: string) {
  const [camera] = await db
    .select()
    .from(cameras)
    .where(eq(cameras.userId, userId))
    .orderBy(desc(cameras.createdAt))
    .limit(1);
  return camera ? toCameraDto(camera) : null;
}

export async function getCameraForUser(cameraId: string, userId: string) {
  const [camera] = await db
    .select()
    .from(cameras)
    .where(eq(cameras.id, cameraId))
    .limit(1);
  if (!camera || camera.userId !== userId) return null;
  return toCameraDto(camera);
}

export async function getCameraWithOwner(cameraId: string) {
  const [row] = await db
    .select({ camera: cameras, owner: user })
    .from(cameras)
    .innerJoin(user, eq(cameras.userId, user.id))
    .where(eq(cameras.id, cameraId))
    .limit(1);
  return row ?? null;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderCameraCardSvg(
  camera: CameraDto,
  owner: { name: string; username: string },
) {
  const body = getBody(camera.bodyColor);
  const lens = getLens(camera.lens);
  const film = getFilm(camera.filmStock);
  const strap = getStrap(camera.strap);
  const accent = camera.accentColor;
  const name = escapeXml(camera.name);
  const engraving = escapeXml(camera.engraving || "MADE FOR THE LONG WAY");
  const serial = escapeXml(camera.serial);
  const ownerName = escapeXml(owner.name);
  const handle = escapeXml(`@${owner.username}`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#182019"/>
      <stop offset="0.55" stop-color="#202a21"/>
      <stop offset="1" stop-color="#0e120f"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${body.top}"/>
      <stop offset="1" stop-color="${body.body}"/>
    </linearGradient>
    <radialGradient id="glass" cx="42%" cy="36%" r="70%">
      <stop offset="0" stop-color="#e8eee3" stop-opacity=".95"/>
      <stop offset=".2" stop-color="#8ea799"/>
      <stop offset=".48" stop-color="#30473d"/>
      <stop offset="1" stop-color="#080d0b"/>
    </radialGradient>
    <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#000" stop-opacity=".62"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope=".055"/></feComponentTransfer>
    </filter>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M60 0H0V60" fill="none" stroke="#f2eee4" stroke-opacity=".045" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="1600" fill="url(#bg)"/>
  <rect width="1200" height="1600" fill="url(#grid)"/>
  <rect width="1200" height="1600" filter="url(#grain)" opacity=".8"/>
  <text x="80" y="100" fill="#e9e2d3" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="17" letter-spacing="5">GOHIKING.CLUB / FIELD CAMERA DIVISION</text>
  <text x="1120" y="100" text-anchor="end" fill="#e96b40" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="17" letter-spacing="2">${serial}</text>
  <line x1="80" y1="130" x2="1120" y2="130" stroke="#f2eee4" stroke-opacity=".22"/>
  <text x="80" y="226" fill="#f0eadc" font-family="Georgia, 'Songti SC', serif" font-size="68" letter-spacing="-1">${name}</text>
  <text x="82" y="264" fill="#9da798" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" letter-spacing="3">${engraving}</text>
  <text x="1120" y="226" text-anchor="end" fill="#df5a34" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" letter-spacing="2">ONE OF ONE / DIGITAL FIELD CAMERA</text>

  <ellipse cx="600" cy="930" rx="430" ry="78" fill="url(#shadow)"/>

  <g transform="translate(600 690) rotate(-5)">
    <rect x="-390" y="-190" width="780" height="370" rx="42" fill="${body.body}"/>
    <rect x="-390" y="-190" width="780" height="370" rx="42" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="3"/>
    <rect x="-370" y="-170" width="740" height="86" rx="20" fill="${body.top}"/>
    <rect x="-370" y="-170" width="740" height="86" rx="20" fill="none" stroke="#fff" stroke-opacity=".18"/>
    <rect x="-320" y="110" width="300" height="52" rx="12" fill="${body.grip}"/>
    <rect x="330" y="-170" width="34" height="44" rx="8" fill="${accent}"/>
    <text x="318" y="-125" text-anchor="end" fill="#151812" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" letter-spacing="4" opacity=".58">GOHIKING</text>
    <circle cx="300" cy="-188" r="47" fill="#22251f" stroke="${body.top}" stroke-width="4"/>
    <circle cx="300" cy="-188" r="31" fill="#111410"/>
    <circle cx="300" cy="-188" r="8" fill="${accent}"/>

    <g transform="translate(-110 0)">
      <circle r="168" fill="#1a1d19" stroke="${body.top}" stroke-width="6"/>
      <circle r="148" fill="${body.body}" stroke="#0b0d0a" stroke-width="8"/>
      <circle r="132" fill="#2b322b"/>
      <circle r="112" fill="#101410" stroke="${accent}" stroke-width="3"/>
      <circle r="84" fill="url(#glass)" stroke="#050706" stroke-width="5"/>
      <circle r="34" fill="#060907" fill-opacity=".8"/>
      <circle r="18" fill="#c9d6c7" fill-opacity=".18"/>
      <path d="M-68 -70 A96 96 0 0 1 34 -92" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="8" stroke-linecap="round"/>
    </g>
  </g>

  <g transform="translate(600 1050)">
    <rect x="-540" y="-30" width="1080" height="1" fill="#f2eee4" fill-opacity=".2"/>
    <text x="-540" y="30" fill="#e96b40" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" letter-spacing="3">SPECIFICATION</text>
    <text x="-540" y="90" fill="#f0eadc" font-family="Georgia, serif" font-size="30">${lens.name} · ${lens.focal}  ${lens.aperture}</text>
    <text x="-540" y="132" fill="#9da798" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" letter-spacing="2">${lens.latin} / ${film.latin} / ${strap.name}</text>

    <text x="540" y="30" text-anchor="end" fill="#e96b40" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" letter-spacing="3">FILM RECIPE</text>
    <g transform="translate(382 54)">
      ${film.swatch.map((color, index) => `<rect x="${index * 54}" y="0" width="48" height="48" fill="${color}"/>`).join("")}
    </g>
    <text x="540" y="132" text-anchor="end" fill="#9da798" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" letter-spacing="1">${film.note}</text>
  </g>

  <g transform="translate(80 1370)">
    <text fill="#f0eadc" font-family="Georgia, serif" font-size="42">${ownerName}</text>
    <text y="36" fill="#9da798" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="16" letter-spacing="2">${handle}</text>
  </g>
  <g transform="translate(1120 1370)" text-anchor="end">
    <text fill="#e9e2d3" font-family="Georgia, serif" font-size="32" font-style="italic">Built for the long way.</text>
    <text y="38" fill="#9da798" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" letter-spacing="3">GOHIKING.CLUB · EST. 2026</text>
  </g>
  <line x1="80" y1="1450" x2="1120" y2="1450" stroke="#f2eee4" stroke-opacity=".18"/>
  <text x="80" y="1500" fill="#6e776c" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" letter-spacing="2">ONE OF ONE · DIGITAL FIELD CAMERA · NOT A PRODUCT, A POINT OF VIEW</text>
</svg>`;
}

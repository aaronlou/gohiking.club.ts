import exifr from "exifr";
import sharp from "sharp";
import { photoMediaKey, writeMedia } from "./storage";

export const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

export const MAX_UPLOAD_MB = Number(process.env.UPLOAD_MAX_MB ?? 20);
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export type PhotoExif = {
  takenAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  cameraModel: string | null;
  lensModel: string | null;
  aperture: string | null;
  shutterSpeed: string | null;
  iso: number | null;
  focalLength: string | null;
};

export type PreparedPhoto = {
  width: number;
  height: number;
  fullKey: string;
  previewKey: string;
  thumbKey: string;
  blurData: string;
  dominantColor: string;
  exif: PhotoExif;
  modelBuffer: Buffer;
};

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatExposure(value: unknown) {
  const exposure = finiteNumber(value);
  if (!exposure || exposure <= 0) return null;
  if (exposure >= 1) return `${exposure.toFixed(1)}s`;
  return `1/${Math.round(1 / exposure)}s`;
}

function formatFocal(value: unknown) {
  const focal = finiteNumber(value);
  if (!focal) return null;
  return `${Math.round(focal)}mm`;
}

function cleanString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : null;
}

export async function extractExif(buffer: Buffer): Promise<PhotoExif> {
  const empty: PhotoExif = {
    takenAt: null,
    latitude: null,
    longitude: null,
    cameraModel: null,
    lensModel: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    focalLength: null,
  };

  try {
    const data = (await exifr.parse(buffer, {
      tiff: true,
      exif: true,
      gps: true,
      pick: [
        "DateTimeOriginal",
        "CreateDate",
        "Make",
        "Model",
        "LensModel",
        "FNumber",
        "ExposureTime",
        "ISO",
        "FocalLength",
        "latitude",
        "longitude",
      ],
    })) as Record<string, unknown> | undefined;

    if (!data) return empty;

    const rawDate = data.DateTimeOriginal ?? data.CreateDate;
    const parsedDate = rawDate instanceof Date ? rawDate : null;
    const takenAt =
      parsedDate && !Number.isNaN(parsedDate.getTime()) && parsedDate.getTime() <= Date.now() + 86_400_000
        ? parsedDate
        : null;

    const make = cleanString(data.Make);
    const model = cleanString(data.Model);
    const cameraModel = [make, model].filter(Boolean).join(" ").trim() || null;

    return {
      takenAt,
      latitude: finiteNumber(data.latitude),
      longitude: finiteNumber(data.longitude),
      cameraModel,
      lensModel: cleanString(data.LensModel),
      aperture: finiteNumber(data.FNumber) ? `f/${finiteNumber(data.FNumber)?.toFixed(1)}` : null,
      shutterSpeed: formatExposure(data.ExposureTime),
      iso: finiteNumber(data.ISO) ? Math.round(finiteNumber(data.ISO) as number) : null,
      focalLength: formatFocal(data.FocalLength),
    };
  } catch {
    return empty;
  }
}

/**
 * Produces three delivery sizes:
 * - full: native pixel dimensions, metadata stripped, only fetched on demand
 * - preview: 1280px, used by detail/hero surfaces
 * - thumb: 720px, used by gallery cards and studio
 *
 * Native pixels are never used for page loads. The browser sees full only after
 * the reader explicitly asks for the original.
 */
export async function preparePhoto(
  buffer: Buffer,
  photoId: string,
  scope: "photos" | "quarantine" = "quarantine",
): Promise<PreparedPhoto> {
  const image = sharp(buffer, { limitInputPixels: 120_000_000, failOn: "error" }).rotate();
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("这张图片没有读取成功，换一张试试吧。");
  }
  if (metadata.width < 600 || metadata.height < 400) {
    throw new Error("这张图有点小。长边至少需要 600px，短边至少需要 400px，换一张原图试试吧。");
  }

  const fullBuffer = await image
    .clone()
    .webp({ quality: 82, effort: 4, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });

  const previewBuffer = await image
    .clone()
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 76, effort: 4 })
    .toBuffer();

  const thumbBuffer = await image
    .clone()
    .resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 74, effort: 4 })
    .toBuffer();

  const blurBuffer = await image
    .clone()
    .resize({ width: 24, height: 24, fit: "inside" })
    .webp({ quality: 35 })
    .toBuffer();

  const modelBuffer = await image
    .clone()
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();

  const stats = await sharp(previewBuffer).stats();
  const dominant = stats.dominant;
  const dominantColor = `#${[dominant.r, dominant.g, dominant.b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;

  const fullKey = photoMediaKey(scope, photoId, "full");
  const previewKey = photoMediaKey(scope, photoId, "preview");
  const thumbKey = photoMediaKey(scope, photoId, "thumb");
  const blurKey = photoMediaKey(scope, photoId, "blur");

  await Promise.all([
    writeMedia(fullKey, fullBuffer.data),
    writeMedia(previewKey, previewBuffer),
    writeMedia(thumbKey, thumbBuffer),
    writeMedia(blurKey, blurBuffer),
  ]);

  const exif = await extractExif(buffer);

  return {
    width: fullBuffer.info.width,
    height: fullBuffer.info.height,
    fullKey,
    previewKey,
    thumbKey,
    blurData: `data:image/webp;base64,${blurBuffer.toString("base64")}`,
    dominantColor,
    exif,
    modelBuffer,
  };
}

export async function prepareModelImage(buffer: Buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

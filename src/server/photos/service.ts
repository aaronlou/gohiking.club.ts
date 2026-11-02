import { randomUUID } from "node:crypto";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { getTheme } from "@/lib/constants";
import type { PhotoUploadInput } from "@/lib/validation";
import { evaluatePhoto } from "@/server/ai/evaluator";
import { db } from "@/server/db";
import { likes, photos, user } from "@/server/db/schema";
import { prepareModelImage, preparePhoto } from "@/server/media/process";
import {
  deleteMedia,
  deletePhotoDirectory,
  moveMedia,
  photoMediaKey,
} from "@/server/media/storage";
import { toPhotoDto, type PhotoDto } from "./dto";

export class PhotoServiceError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "PhotoServiceError";
    this.status = status;
    this.code = code;
  }
}

const evaluationsInFlight = new Set<string>();

function parseTakenAt(value: string | undefined | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00+08:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createPhoto(input: {
  userId: string;
  fileBuffer: Buffer;
  fields: PhotoUploadInput;
  activityId: string;
}) {
  const { userId, fileBuffer, fields, activityId } = input;
  const photoId = randomUUID();

  let prepared;
  try {
    prepared = await preparePhoto(fileBuffer, photoId, "quarantine");
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片处理失败";
    throw new PhotoServiceError(422, "invalid_image", message);
  }

  const takenAt = parseTakenAt(fields.takenAt) ?? prepared.exif.takenAt;

  try {
    const [photo] = await db
      .insert(photos)
      .values({
        id: photoId,
        userId,
        title: fields.title?.trim() || "未命名山野",
        caption: fields.caption || null,
        activityId,
        theme: fields.theme,
        visibility: "activity",
        status: "evaluating",
        takenAt,
        locationName: fields.locationName || null,
        latitude: prepared.exif.latitude,
        longitude: prepared.exif.longitude,
        cameraModel: prepared.exif.cameraModel,
        lensModel: prepared.exif.lensModel,
        aperture: prepared.exif.aperture,
        shutterSpeed: prepared.exif.shutterSpeed,
        iso: prepared.exif.iso,
        focalLength: prepared.exif.focalLength,
        width: prepared.width,
        height: prepared.height,
        fileKey: prepared.fullKey,
        previewKey: prepared.previewKey,
        thumbKey: prepared.thumbKey,
        blurData: prepared.blurData,
        dominantColor: prepared.dominantColor,
        source: fields.source,
      })
      .returning();

    if (!photo) {
      throw new PhotoServiceError(500, "create_failed", "无法建立影像档案");
    }

    return photo;
  } catch (error) {
    await deletePhotoDirectory("quarantine", photoId);
    if (error instanceof PhotoServiceError) throw error;
    throw new PhotoServiceError(500, "create_failed", "无法建立影像档案，请重试");
  }
}

async function loadPhotoForEvaluation(photoId: string, userId: string) {
  const [row] = await db
    .select({ photo: photos, author: user })
    .from(photos)
    .innerJoin(user, eq(photos.userId, user.id))
    .where(eq(photos.id, photoId))
    .limit(1);

  if (!row) {
    throw new PhotoServiceError(404, "not_found", "没有找到这张照片");
  }
  if (row.photo.userId !== userId) {
    throw new PhotoServiceError(403, "forbidden", "这张照片现在只属于它的拍摄者");
  }
  return row;
}

export async function evaluateAndFinalize(
  photoId: string,
  userId: string,
  options: { publish?: boolean } = {},
): Promise<{
  photo: PhotoDto;
  accepted: boolean;
  latencyMs: number;
}> {
  if (evaluationsInFlight.has(photoId)) {
    throw new PhotoServiceError(409, "already_evaluating", "这张照片正在被认真观看，稍等一下");
  }

  const { photo, author } = await loadPhotoForEvaluation(photoId, userId);

  if (photo.status === "accepted") {
    if (options.publish && photo.visibility !== "public") {
      const [published] = await db
        .update(photos)
        .set({ visibility: "public" })
        .where(eq(photos.id, photoId))
        .returning();
      if (published) {
        return { photo: toPhotoDto(published, author), accepted: true, latencyMs: 0 };
      }
    }
    return {
      photo: toPhotoDto(photo, author, { activity: null }),
      accepted: true,
      latencyMs: 0,
    };
  }
  if (photo.status === "rejected") {
    throw new PhotoServiceError(409, "already_finished", "这张照片已经有一份手记了");
  }
  if (!photo.fileKey) {
    throw new PhotoServiceError(422, "missing_file", "照片文件缺失，请重新上传");
  }

  evaluationsInFlight.add(photoId);

  try {
    const analysisKey = photo.previewKey ?? photo.fileKey;
    let fileBuffer: Buffer;
    try {
      const { readMedia } = await import("@/server/media/storage");
      fileBuffer = await readMedia(analysisKey);
    } catch {
      throw new PhotoServiceError(422, "missing_file", "照片文件缺失，请重新上传");
    }

    const modelImage = await prepareModelImage(fileBuffer);
    const contextTheme = photo.theme === "auto" ? "trail" : photo.theme;

    const evaluation = await evaluatePhoto(modelImage, {
      title: photo.title,
      caption: photo.caption,
      theme: contextTheme,
      locationName: photo.locationName,
      takenAt: photo.takenAt,
      cameraModel: photo.cameraModel,
      lensModel: photo.lensModel,
      isHikingContext: true,
    });

    const accepted = evaluation.score >= 3;
    const now = new Date();
    const resolvedTheme =
      photo.theme === "auto" ? evaluation.theme : getTheme(photo.theme).id;
    const common = {
      score: evaluation.score.toFixed(1),
      aiSummary: evaluation.summary,
      aiStrengths: evaluation.strengths,
      aiImprovements: evaluation.improvements,
      aiTags: evaluation.tags,
      aiTheme: evaluation.theme,
      aiModel: evaluation.model,
      aiProvider: evaluation.provider,
      theme: resolvedTheme,
      evaluatedAt: now,
    };

    let updated;

    if (accepted) {
      const fullKey = photoMediaKey("photos", photoId, "full");
      const previewKey = photoMediaKey("photos", photoId, "preview");
      const thumbKey = photoMediaKey("photos", photoId, "thumb");
      const moves: Array<{ from: string; to: string }> = [];
      const move = async (from: string | null, to: string) => {
        if (!from) return false;
        await moveMedia(from, to);
        moves.push({ from, to });
        return true;
      };

      try {
        await move(photo.fileKey, fullKey);
        const movedPreview = await move(photo.previewKey, previewKey);
        await move(photo.thumbKey, thumbKey);
        [updated] = await db
          .update(photos)
          .set({
            ...common,
            status: "accepted",
            visibility: options.publish ? "public" : photo.visibility,
            acceptedAt: now,
            expiresAt: null,
            fileKey: fullKey,
            previewKey: movedPreview ? previewKey : null,
            thumbKey,
          })
          .where(eq(photos.id, photoId))
          .returning();
      } catch (error) {
        for (const item of moves.reverse()) {
          await moveMedia(item.to, item.from).catch(() => undefined);
        }
        throw error;
      }

      await deleteMedia([photoMediaKey("quarantine", photoId, "blur")]);
      await deletePhotoDirectory("quarantine", photoId).catch(() => undefined);
    } else {
      // Below the invitation line the photo is not kept at all — not even
      // inside an activity. Build the handnote first, then remove the file and
      // the row so nothing is silently stored after the result is shown.
      const rejectedPhoto = {
        ...photo,
        ...common,
        status: "rejected" as const,
        expiresAt: null,
      };
      const dto = toPhotoDto(rejectedPhoto, author);

      await deletePhotoDirectory("quarantine", photoId).catch((error) => {
        console.error(`[reject] could not remove media ${photoId}`, error);
      });
      await deletePhotoDirectory("photos", photoId).catch((error) => {
        console.error(`[reject] could not remove media ${photoId}`, error);
      });
      await db
        .delete(photos)
        .where(eq(photos.id, photoId))
        .catch((error) => {
          console.error(`[reject] could not remove row ${photoId}`, error);
        });

      console.info(
        `[reject] photo removed id=${photoId} score=${evaluation.score}`,
      );

      return { photo: dto, accepted: false, latencyMs: evaluation.latencyMs };
    }

    if (!updated) {
      throw new PhotoServiceError(500, "finalize_failed", "手记暂时没有存好，请再试一次");
    }

    return {
      photo: toPhotoDto(updated, author),
      accepted,
      latencyMs: evaluation.latencyMs,
    };
  } catch (error) {
    await db
      .update(photos)
      .set({ status: "failed" })
      .where(and(eq(photos.id, photoId), eq(photos.status, "evaluating")))
      .catch(() => undefined);

    if (error instanceof PhotoServiceError) throw error;
    throw error;
  } finally {
    evaluationsInFlight.delete(photoId);
  }
}

export async function discardPhoto(photoId: string, userId: string) {
  const [photo] = await db
    .select()
    .from(photos)
    .where(and(eq(photos.id, photoId), eq(photos.userId, userId)))
    .limit(1);

  if (!photo) {
    throw new PhotoServiceError(404, "not_found", "没有找到这张照片");
  }

  await deletePhotoDirectory("quarantine", photoId);
  await deletePhotoDirectory("photos", photoId);
  await db.delete(photos).where(eq(photos.id, photoId));
}

export async function retryFailedPhoto(photoId: string, userId: string) {
  const [photo] = await db
    .select()
    .from(photos)
    .where(and(eq(photos.id, photoId), eq(photos.userId, userId)))
    .limit(1);
  if (!photo) throw new PhotoServiceError(404, "not_found", "没有找到这张照片");
  if (photo.status !== "failed" && photo.status !== "evaluating") {
    throw new PhotoServiceError(409, "not_retryable", "这张照片现在不需要重新观看");
  }
  await db.update(photos).set({ status: "evaluating" }).where(eq(photos.id, photoId));
  return evaluateAndFinalize(photoId, userId);
}

export async function togglePhotoLike(photoId: string, userId: string) {
  const [photo] = await db
    .select({ id: photos.id, visibility: photos.visibility, status: photos.status })
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1);

  if (!photo || photo.status !== "accepted" || photo.visibility !== "public") {
    throw new PhotoServiceError(404, "not_found", "没有找到这张公开照片");
  }

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(likes)
      .values({ photoId, userId })
      .onConflictDoNothing()
      .returning();

    if (inserted.length > 0) {
      const [updated] = await tx
        .update(photos)
        .set({ likeCount: sql`${photos.likeCount} + 1` })
        .where(eq(photos.id, photoId))
        .returning({ likeCount: photos.likeCount });
      return { liked: true, likeCount: updated?.likeCount ?? 1 };
    }

    await tx.delete(likes).where(and(eq(likes.photoId, photoId), eq(likes.userId, userId)));
    const [updated] = await tx
      .update(photos)
      .set({ likeCount: sql`greatest(${photos.likeCount} - 1, 0)` })
      .where(eq(photos.id, photoId))
      .returning({ likeCount: photos.likeCount });
    return { liked: false, likeCount: updated?.likeCount ?? 0 };
  });
}

export async function getPhotoRecord(photoId: string) {
  const [photo] = await db.select().from(photos).where(eq(photos.id, photoId)).limit(1);
  return photo ?? null;
}

export async function cleanupExpiredMedia() {
  const now = new Date();
  // Rejected photos are no longer held anywhere; this also sweeps legacy rows
  // created before the upload-time scoring rule.
  const expired = await db
    .select({ id: photos.id })
    .from(photos)
    .where(eq(photos.status, "rejected"))
    .limit(50);

  for (const photo of expired) {
    await deletePhotoDirectory("quarantine", photo.id);
    await deletePhotoDirectory("photos", photo.id);
    await db.delete(photos).where(eq(photos.id, photo.id));
  }

  const staleFailedCutoff = new Date(now.getTime() - 48 * 3_600_000);
  const staleFailed = await db
    .select({ id: photos.id })
    .from(photos)
    .where(
      and(
        eq(photos.status, "failed"),
        isNull(photos.activityId),
        lt(photos.createdAt, staleFailedCutoff),
      ),
    )
    .limit(20);

  for (const photo of staleFailed) {
    await deletePhotoDirectory("quarantine", photo.id);
    await db.delete(photos).where(eq(photos.id, photo.id));
  }

  const staleEvaluatingCutoff = new Date(now.getTime() - 2 * 3_600_000);
  const staleEvaluating = await db
    .update(photos)
    .set({ status: "failed" })
    .where(and(eq(photos.status, "evaluating"), lt(photos.createdAt, staleEvaluatingCutoff)))
    .returning({ id: photos.id });

  return {
    purged: expired.length,
    staleFailed: staleFailed.length,
    staleEvaluating: staleEvaluating.length,
  };
}

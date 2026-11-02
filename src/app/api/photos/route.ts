import { NextResponse } from "next/server";
import { canUploadToActivity } from "@/server/activities/access";
import { photoUploadSchema } from "@/lib/validation";
import { requireApiUser } from "@/server/auth-session";
import { ACCEPTED_MIME_TYPES, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/server/media/process";
import { getPhotoById, countRecentUploads } from "@/server/photos/queries";
import { createPhoto, PhotoServiceError } from "@/server/photos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(request: Request) {
  const user = await requireApiUser(request);
  if (!user) {
    return errorResponse("先登录，再把山野放进来吧。", "unauthorized", 401);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES + 2 * 1024 * 1024) {
    return errorResponse(`这张照片超过了 ${MAX_UPLOAD_MB}MB，压缩一下再试试吧。`, "too_large", 413);
  }

  const limit = Number(process.env.UPLOADS_PER_HOUR ?? 30);
  const recent = await countRecentUploads(user.id, 1);
  if (recent >= limit) {
    return errorResponse(
      `慢一点也没关系。每小时最多可以放进 ${limit} 张照片，让每一次观看都更认真。`,
      "rate_limited",
      429,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("照片没有顺利传过来，再试一次吧。", "invalid_form", 400);
  }

  const photoFile = formData.get("photo");
  if (
    !photoFile ||
    typeof photoFile !== "object" ||
    !("arrayBuffer" in photoFile) ||
    !("size" in photoFile)
  ) {
    return errorResponse("先挑一张照片吧。", "missing_file", 400);
  }

  const file = photoFile as File;
  if (file.size <= 0) {
    return errorResponse("这张照片好像没有内容，换一张试试吧。", "empty_file", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return errorResponse(`这张照片超过了 ${MAX_UPLOAD_MB}MB，压缩一下再试试吧。`, "too_large", 413);
  }
  if (file.type && !ACCEPTED_MIME_TYPES.has(file.type) && !file.type.startsWith("image/")) {
    return errorResponse("可以试试 JPEG、PNG、WebP、AVIF 或 HEIC 格式的照片。", "invalid_type", 415);
  }

  const parsed = photoUploadSchema.safeParse({
    title: formData.get("title"),
    caption: formData.get("caption") ?? "",
    theme: formData.get("theme") ?? "auto",
    visibility: formData.get("visibility") ?? "public",
    locationName: formData.get("locationName") ?? "",
    takenAt: formData.get("takenAt") ?? "",
    source: formData.get("source") ?? "upload",
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "表单信息不完整", code: "invalid_input", field: issue?.path?.[0] },
      { status: 400 },
    );
  }

  const activityId = formData.get("activityId");
  if (!activityId) {
    return errorResponse(
      "每一张照片都需要先归入一次徒步活动。请从活动相册进入上传。",
      "activity_required",
      400,
    );
  }
  if (typeof activityId !== "string" || !/^[0-9a-f-]{36}$/i.test(activityId)) {
    return errorResponse("没有找到这次活动。", "invalid_activity", 400);
  }
  if (!(await canUploadToActivity(activityId, user.id))) {
    return errorResponse("加入这次活动之后，才能把照片放进去。", "not_member", 403);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const photo = await createPhoto({
      userId: user.id,
      fileBuffer: buffer,
      fields: parsed.data,
      activityId,
    });

    const dto = await getPhotoById(photo.id, user.id);
    return NextResponse.json({ photo: dto }, { status: 201 });
  } catch (error) {
    if (error instanceof PhotoServiceError) {
      return errorResponse(error.message, error.code, error.status);
    }
    console.error("[upload] failed", error);
    return errorResponse("照片暂时没有收好，稍后再试一次吧。", "upload_failed", 500);
  }
}

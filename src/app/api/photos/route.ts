import { NextResponse } from "next/server";
import { photoUploadSchema } from "@/lib/validation";
import { requireApiUser } from "@/server/auth-session";
import { ACCEPTED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/server/media/process";
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
    return errorResponse("请先登录，再上传山野照片", "unauthorized", 401);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES + 2 * 1024 * 1024) {
    return errorResponse("照片超过大小限制", "too_large", 413);
  }

  const limit = Number(process.env.UPLOADS_PER_HOUR ?? 12);
  const recent = await countRecentUploads(user.id, 1);
  if (recent >= limit) {
    return errorResponse(
      `每小时最多提交 ${limit} 张照片，让每一次观看都更认真一些。`,
      "rate_limited",
      429,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("无法读取上传内容，请重试", "invalid_form", 400);
  }

  const photoFile = formData.get("photo");
  if (
    !photoFile ||
    typeof photoFile !== "object" ||
    !("arrayBuffer" in photoFile) ||
    !("size" in photoFile)
  ) {
    return errorResponse("请选择一张照片", "missing_file", 400);
  }

  const file = photoFile as File;
  if (file.size <= 0) {
    return errorResponse("照片文件是空的", "empty_file", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return errorResponse("照片超过大小限制", "too_large", 413);
  }
  if (file.type && !ACCEPTED_MIME_TYPES.has(file.type) && !file.type.startsWith("image/")) {
    return errorResponse("只接受 JPEG、PNG、WebP、AVIF 或 HEIC 图片", "invalid_type", 415);
  }

  const parsed = photoUploadSchema.safeParse({
    title: formData.get("title"),
    caption: formData.get("caption") ?? "",
    theme: formData.get("theme") ?? "auto",
    visibility: formData.get("visibility") ?? "public",
    locationName: formData.get("locationName") ?? "",
    takenAt: formData.get("takenAt") ?? "",
    cameraId: formData.get("cameraId") ?? "",
    source: formData.get("source") ?? "upload",
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "表单信息不完整", code: "invalid_input", field: issue?.path?.[0] },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const photo = await createPhoto({
      userId: user.id,
      fileBuffer: buffer,
      fields: parsed.data,
      cameraId: parsed.data.cameraId || null,
    });

    const dto = await getPhotoById(photo.id, user.id);
    return NextResponse.json({ photo: dto }, { status: 201 });
  } catch (error) {
    if (error instanceof PhotoServiceError) {
      return errorResponse(error.message, error.code, error.status);
    }
    console.error("[upload] failed", error);
    return errorResponse("照片没有存下来，请稍后重试", "upload_failed", 500);
  }
}

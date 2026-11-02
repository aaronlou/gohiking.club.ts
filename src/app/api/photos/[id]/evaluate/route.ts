import { NextResponse } from "next/server";
import { AIServiceError } from "@/server/ai/evaluator";
import { requireApiUser } from "@/server/auth-session";
import { signPhotoMedia } from "@/server/media/signed-url";
import { evaluateAndFinalize, PhotoServiceError } from "@/server/photos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "照片不存在", code: "not_found" }, { status: 404 });
  }

  try {
    const result = await evaluateAndFinalize(id, user.id);
    return NextResponse.json(
      { ...result, photo: signPhotoMedia(result.photo, user.id) },
      {
        headers: { "cache-control": "no-store" },
      },
    );
  } catch (error) {
    if (error instanceof PhotoServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    if (error instanceof AIServiceError) {
      const status =
        error.code === "timeout" ? 504 : error.code === "invalid_response" ? 502 : 503;
      console.error(`[evaluate] ai_error code=${error.code}`, error.cause ?? error);
      return NextResponse.json(
        {
          error: error.publicMessage,
          code: error.code,
          retryable: true,
        },
        { status },
      );
    }
    console.error("[evaluate] failed", error);
    return NextResponse.json(
      { error: "这次观看还没有完成，照片好好地保留着，稍后再试一次吧。", code: "evaluate_failed", retryable: true },
      { status: 500 },
    );
  }
}

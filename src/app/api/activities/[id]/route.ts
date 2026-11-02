import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/auth-session";
import { ActivityServiceError, closeActivity } from "@/server/activities/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let status: "open" | "closed" | null = null;
  try {
    const body = (await request.json()) as { status?: string };
    if (body.status === "open" || body.status === "closed") status = body.status;
  } catch {
    status = null;
  }

  if (!status) {
    return NextResponse.json({ error: "未知的状态", code: "invalid_status" }, { status: 400 });
  }

  try {
    const result = await closeActivity(id, user.id, status);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ActivityServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "状态没有更新，请稍后重试。", code: "update_failed" }, { status: 500 });
  }
}

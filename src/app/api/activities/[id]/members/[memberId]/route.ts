import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/auth-session";
import {
  ActivityServiceError,
  decideMembership,
  removeMember,
} from "@/server/activities/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const user = await requireApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await params;
  let action: "approve" | "reject" | null = null;
  try {
    const body = (await request.json()) as { action?: string };
    if (body.action === "approve" || body.action === "reject") action = body.action;
  } catch {
    action = null;
  }

  if (!action) {
    return NextResponse.json({ error: "未知的操作", code: "invalid_action" }, { status: 400 });
  }

  try {
    const result = await decideMembership(id, user.id, memberId, action);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ActivityServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[activity] decision failed", error);
    return NextResponse.json({ error: "审批没有完成，请稍后重试。", code: "decide_failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const user = await requireApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await params;
  try {
    await removeMember(id, user.id, memberId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ActivityServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "操作没有完成，请稍后重试。", code: "remove_failed" }, { status: 500 });
  }
}

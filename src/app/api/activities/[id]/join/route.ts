import { NextResponse } from "next/server";
import { activityJoinSchema } from "@/lib/validation";
import { requireApiUser } from "@/server/auth-session";
import {
  ActivityServiceError,
  applyToActivity,
  withdrawApplication,
} from "@/server/activities/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "登录后才能申请加入。", code: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = activityJoinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "留言太长", code: "invalid_input" },
      { status: 400 },
    );
  }

  try {
    const result = await applyToActivity(id, user.id, parsed.data.note);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ActivityServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[activity] join failed", error);
    return NextResponse.json({ error: "申请没有提交成功，请稍后重试。", code: "join_failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await withdrawApplication(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ActivityServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "撤回失败，请稍后重试。", code: "withdraw_failed" }, { status: 500 });
  }
}

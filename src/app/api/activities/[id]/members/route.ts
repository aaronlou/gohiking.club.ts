import { NextResponse } from "next/server";
import { activityInviteSchema } from "@/lib/validation";
import { requireApiUser } from "@/server/auth-session";
import { ActivityServiceError, inviteMember } from "@/server/activities/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = activityInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "请输入用户名", code: "invalid_input" },
      { status: 400 },
    );
  }

  try {
    const result = await inviteMember(id, user.id, parsed.data.username);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ActivityServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[activity] invite failed", error);
    return NextResponse.json({ error: "邀请没有完成，请稍后重试。", code: "invite_failed" }, { status: 500 });
  }
}

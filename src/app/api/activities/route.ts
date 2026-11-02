import { NextResponse } from "next/server";
import { activityCreateSchema } from "@/lib/validation";
import { requireApiUser } from "@/server/auth-session";
import { ActivityServiceError, createActivity } from "@/server/activities/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "先登录，再发起活动吧。", code: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "活动信息没有传过来。", code: "invalid_body" }, { status: 400 });
  }

  const parsed = activityCreateSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "活动信息不完整", code: "invalid_input", field: issue?.path?.[0] },
      { status: 400 },
    );
  }

  try {
    const activity = await createActivity(user.id, parsed.data);
    return NextResponse.json(
      { activity: { id: activity.id, slug: activity.slug } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ActivityServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[activity] create failed", error);
    return NextResponse.json({ error: "活动没有建立成功，请稍后重试。", code: "create_failed" }, { status: 500 });
  }
}

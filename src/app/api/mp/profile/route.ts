import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { requireApiUser } from "@/server/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const profileSchema = z.object({
  name: z.string().trim().min(1, "称呼不能为空").max(30, "称呼最多 30 字"),
  homeBase: z.string().trim().max(40, "常出发地最多 40 字").optional(),
  bio: z.string().trim().max(280, "简介最多 280 字").optional(),
});

export async function PATCH(request: Request) {
  const viewer = await requireApiUser(request);
  if (!viewer) {
    return NextResponse.json({ error: "请先登录", code: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式有误", code: "invalid_json" }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "资料格式有误", code: "invalid_form", field: issue?.path?.[0] },
      { status: 400 },
    );
  }

  await db
    .update(user)
    .set({
      name: parsed.data.name,
      homeBase: parsed.data.homeBase ?? null,
      bio: parsed.data.bio ?? null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, viewer.id));

  return NextResponse.json({ ok: true });
}

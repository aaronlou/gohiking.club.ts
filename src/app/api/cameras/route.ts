import { NextResponse } from "next/server";
import { cameraDesignSchema } from "@/lib/validation";
import { requireApiUser } from "@/server/auth-session";
import { createCamera } from "@/server/cameras/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "登录后才能保存自己的相机", code: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "无法读取相机配置" }, { status: 400 });
  }

  const parsed = cameraDesignSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "相机配置不完整", code: "invalid_input" },
      { status: 400 },
    );
  }

  try {
    const camera = await createCamera(user.id, parsed.data);
    return NextResponse.json({ camera }, { status: 201 });
  } catch (error) {
    console.error("[camera] create failed", error);
    return NextResponse.json({ error: "相机装配失败，请重试" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/auth-session";
import { discardPhoto, PhotoServiceError } from "@/server/photos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await discardPhoto(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PhotoServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "删除失败，请重试" }, { status: 500 });
  }
}

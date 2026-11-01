import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/auth-session";
import { PhotoServiceError, togglePhotoLike } from "@/server/photos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "登录后才能留下敬意", code: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const result = await togglePhotoLike(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PhotoServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "操作失败，请重试" }, { status: 500 });
  }
}

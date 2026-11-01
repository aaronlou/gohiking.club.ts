import { NextResponse } from "next/server";
import { getCameraWithOwner, renderCameraCardSvg, toCameraDto } from "@/server/cameras/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const row = await getCameraWithOwner(id);
  if (!row) {
    return new NextResponse("Not found", { status: 404 });
  }

  const camera = toCameraDto(row.camera);
  const svg = renderCameraCardSvg(camera, {
    name: row.owner.name,
    username: row.owner.username,
  });
  const filename = `gohiking-${camera.serial.replace(/[^a-zA-Z0-9-]/g, "")}.svg`;

  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "private, max-age=3600",
    },
  });
}

import { NextResponse } from "next/server";
import {
  getHostPendingRequests,
  getMyActivities,
  listPublicActivities,
} from "@/server/activities/queries";
import { requireApiUser } from "@/server/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewer = await requireApiUser(request);

  if (!viewer) {
    const publicActivities = await listPublicActivities();
    return NextResponse.json({
      publicActivities,
      myActivities: [],
      pendingRequests: [],
    });
  }

  const [publicActivities, myActivities, pendingRequests] = await Promise.all([
    listPublicActivities(),
    getMyActivities(viewer.id),
    getHostPendingRequests(viewer.id),
  ]);

  return NextResponse.json({
    publicActivities,
    myActivities,
    pendingRequests,
  });
}

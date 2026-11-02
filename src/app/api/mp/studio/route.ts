import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/auth-session";
import { getStudioOverview, type StudioChapter } from "@/server/studio/queries";
import { getStudioPhotos } from "@/server/photos/queries";
import { signPhotoMedia } from "@/server/media/signed-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type UploadActivityOption = {
  id: string;
  slug: string;
  title: string;
  startDate: string;
  status: string;
};

export async function GET(request: Request) {
  const viewer = await requireApiUser(request);
  if (!viewer) {
    return NextResponse.json({ error: "请先登录", code: "unauthorized" }, { status: 401 });
  }

  const [overview, photos] = await Promise.all([
    getStudioOverview(viewer.id),
    getStudioPhotos(viewer.id),
  ]);

  // Upload gate: activities the viewer may upload into (approved membership).
  const uploadActivities: UploadActivityOption[] = (
    overview.chapters as StudioChapter[]
  ).map((chapter) => ({
    id: chapter.activity.id,
    slug: chapter.activity.slug,
    title: chapter.activity.title,
    startDate: chapter.activity.startDate,
    status: chapter.activity.status,
  }));

  return NextResponse.json({
    user: {
      id: viewer.id,
      name: viewer.name,
      email: viewer.email,
      username: viewer.username,
      bio: viewer.bio ?? null,
      homeBase: viewer.homeBase ?? null,
      createdAt: viewer.createdAt,
    },
    overview,
    photos: photos.map((photo) => signPhotoMedia(photo, viewer.id)),
    uploadActivities,
  });
}

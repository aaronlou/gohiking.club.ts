import { NextResponse } from "next/server";
import { relatedPhotos } from "@/lib/archive";
import { getMembership, isApprovedMembership } from "@/server/activities/access";
import { requireApiUser } from "@/server/auth-session";
import { signPhotoMedia } from "@/server/media/signed-url";
import { getArchiveData, getPhotoById } from "@/server/photos/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireApiUser(request);
  const viewerId = viewer?.id ?? null;

  const photo = await getPhotoById(id, viewerId);
  if (!photo) {
    return NextResponse.json({ error: "没有找到这张照片", code: "not_found" }, { status: 404 });
  }

  const [archive] = await Promise.all([getArchiveData(viewerId)]);
  const related = relatedPhotos(photo, archive, 3);

  const isOwner = viewerId === photo.author.id;
  const membership = photo.activityId && viewerId
    ? await getMembership(photo.activityId, viewerId)
    : null;
  const isActivityMember = isApprovedMembership(membership);
  const isPublic = photo.status === "accepted" && photo.visibility === "public";
  const hasNote = photo.score !== null;

  return NextResponse.json({
    photo: signPhotoMedia(photo, viewerId),
    related: related.map((item) => signPhotoMedia(item, viewerId)),
    viewer: {
      isOwner,
      isActivityMember,
      canLike: Boolean(
        photo.activityId && photo.status === "accepted" && isActivityMember && !isOwner,
      ),
      canSeeNote: (isPublic || isOwner) && hasNote,
      isPublic,
    },
  });
}

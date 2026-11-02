import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/auth-session";
import { getArchiveData, getAuthorStats } from "@/server/photos/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewer = await requireApiUser(request);
  const viewerId = viewer?.id ?? null;

  const photos = await getArchiveData(viewerId);

  // Author index needs cross-photo aggregates per author.
  const authorMap = new Map<string, { photos: typeof photos }>();
  for (const photo of photos) {
    const entry = authorMap.get(photo.author.id) ?? { photos: [] };
    entry.photos.push(photo);
    authorMap.set(photo.author.id, entry);
  }
  const authorStatsList = await Promise.all(
    [...authorMap.keys()].map(async (authorId) => {
      const stats = await getAuthorStats(authorId);
      return { authorId, ...stats };
    }),
  );
  const authorStats = Object.fromEntries(
    authorStatsList.map((item) => [
      item.authorId,
      { accepted: item.accepted, averageScore: item.averageScore, likes: item.likes },
    ]),
  );

  return NextResponse.json({ photos, authorStats });
}

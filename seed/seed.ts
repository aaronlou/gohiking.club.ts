import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { auth } from "../src/server/auth";
import { db } from "../src/server/db";
import { photos, user as users } from "../src/server/db/schema";
import { preparePhoto } from "../src/server/media/process";
import { deletePhotoDirectory } from "../src/server/media/storage";
import { DEMO_PASSWORD, seedPhotos, seedUsers } from "./data";

const assetRoot = path.join(process.cwd(), "seed", "assets");

async function ensureUser(seedUser: (typeof seedUsers)[number]) {
  const [existing] = await db.select().from(users).where(eq(users.email, seedUser.email)).limit(1);
  if (existing) return existing;

  try {
    const result = await auth.api.signUpEmail({
      body: {
        name: seedUser.name,
        email: seedUser.email,
        password: DEMO_PASSWORD,
        username: seedUser.username,
        bio: seedUser.bio,
        homeBase: seedUser.homeBase,
      },
    });
    if (result?.user) {
      const [created] = await db.select().from(users).where(eq(users.id, result.user.id)).limit(1);
      if (created) return created;
    }
  } catch (error) {
    console.warn(`[seed] signUp API failed for ${seedUser.email}, checking for existing row`, error);
  }

  const [fallback] = await db.select().from(users).where(eq(users.email, seedUser.email)).limit(1);
  if (fallback) return fallback;
  throw new Error(`Could not create seed user ${seedUser.email}`);
}

async function main() {
  console.log("→ seeding 山行档案");

  const userIds = new Map<string, string>();
  for (const seedUser of seedUsers) {
    const row = await ensureUser(seedUser);
    userIds.set(seedUser.key, row.id);
    console.log(`  user ${seedUser.username.padEnd(8)} ${row.id}`);
  }

  const demoId = userIds.get("linshen");
  if (!demoId) throw new Error("demo user missing");

  for (const [index, seedPhoto] of seedPhotos.entries()) {
    const buffer = await readFile(path.join(assetRoot, seedPhoto.asset));
    const authorId = userIds.get(seedPhoto.author);
    if (!authorId) throw new Error(`Unknown author ${seedPhoto.author}`);

    const scope = seedPhoto.status === "accepted" ? "photos" : "quarantine";
    await deletePhotoDirectory("photos", seedPhoto.id);
    await deletePhotoDirectory("quarantine", seedPhoto.id);
    const prepared = await preparePhoto(buffer, seedPhoto.id, scope);

    const takenAt = new Date(`${seedPhoto.takenAt}T12:00:00+08:00`);
    const acceptedAt =
      seedPhoto.status === "accepted"
        ? new Date(Date.now() - seedPhoto.daysAgo * 86_400_000 - index * 60_000)
        : null;
    const expiresAt =
      seedPhoto.status === "rejected" ? new Date(Date.now() + 24 * 3_600_000) : null;

    await db
      .insert(photos)
      .values({
        id: seedPhoto.id,
        userId: authorId,
        title: seedPhoto.title,
        caption: seedPhoto.caption,
        status: seedPhoto.status,
        visibility: "public",
        theme: seedPhoto.theme,
        score: seedPhoto.score.toFixed(1),
        aiSummary: seedPhoto.summary,
        aiStrengths: seedPhoto.strengths,
        aiImprovements: seedPhoto.improvements,
        aiTags: seedPhoto.tags,
        aiTheme: seedPhoto.theme,
        aiProvider: "archive-editor",
        aiModel: "manual-curation-v1",
        takenAt,
        locationName: seedPhoto.locationName,
        width: prepared.width,
        height: prepared.height,
        fileKey: prepared.displayKey,
        thumbKey: prepared.thumbKey,
        blurData: prepared.blurData,
        dominantColor: prepared.dominantColor,
        cameraModel: "FUJIFILM X-T5",
        lensModel: "XF 16-55mm f/2.8",
        aperture: "f/4.0",
        shutterSpeed: "1/250s",
        iso: 200,
        focalLength: "35mm",
        source: "archive",
        creditName: "Unsplash",
        creditUrl: "https://unsplash.com",
        featured: Boolean(seedPhoto.featured),
        likeCount: seedPhoto.likes,
        createdAt: acceptedAt ?? new Date(),
        acceptedAt,
        evaluatedAt: acceptedAt ?? new Date(),
        expiresAt,
      })
      .onConflictDoUpdate({
        target: photos.id,
        set: {
          userId: authorId,
          title: seedPhoto.title,
          caption: seedPhoto.caption,
          status: seedPhoto.status,
          theme: seedPhoto.theme,
          score: seedPhoto.score.toFixed(1),
          aiSummary: seedPhoto.summary,
          aiStrengths: seedPhoto.strengths,
          aiImprovements: seedPhoto.improvements,
          aiTags: seedPhoto.tags,
          aiTheme: seedPhoto.theme,
          takenAt,
          locationName: seedPhoto.locationName,
          visibility: "public",
          source: "archive",
          cameraModel: "FUJIFILM X-T5",
          lensModel: "XF 16-55mm f/2.8",
          width: prepared.width,
          height: prepared.height,
          fileKey: prepared.displayKey,
          thumbKey: prepared.thumbKey,
          blurData: prepared.blurData,
          dominantColor: prepared.dominantColor,
          featured: Boolean(seedPhoto.featured),
          likeCount: seedPhoto.likes,
          acceptedAt,
          evaluatedAt: acceptedAt ?? new Date(),
          expiresAt,
        },
      });

    console.log(
      `  photo ${String(index + 1).padStart(2, "0")} ${seedPhoto.asset.padEnd(20)} ${seedPhoto.status}`,
    );
  }

  const counts = await db.select({ id: photos.id }).from(photos);
  console.log(`✓ seed complete · ${counts.length} archive records`);
  console.log(`  demo login: hiker@gohiking.club / ${DEMO_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq, inArray } from "drizzle-orm";
import { auth } from "../src/server/auth";
import { db } from "../src/server/db";
import { activities, activityMembers, photos, user as users } from "../src/server/db/schema";
import { preparePhoto } from "../src/server/media/process";
import { deletePhotoDirectory } from "../src/server/media/storage";
import { DEMO_PASSWORD, seedPhotos, seedUsers } from "./data";

const assetRoot = path.join(process.cwd(), "seed", "assets");
const randomPasswords = process.env.SEED_RANDOM_PASSWORDS === "true";

async function ensureUser(seedUser: (typeof seedUsers)[number]) {
  const [existing] = await db.select().from(users).where(eq(users.email, seedUser.email)).limit(1);
  if (existing) return existing;

  const password = randomPasswords ? randomBytes(32).toString("base64url") : DEMO_PASSWORD;

  try {
    const result = await auth.api.signUpEmail({
      body: {
        name: seedUser.name,
        email: seedUser.email,
        password,
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
    if (seedPhoto.status === "rejected") {
      console.log(
        `  photo ${String(index + 1).padStart(2, "0")} ${seedPhoto.asset.padEnd(20)} skipped (rejected photos are not stored)`,
      );
      continue;
    }

    const buffer = await readFile(path.join(assetRoot, seedPhoto.asset));
    const authorId = userIds.get(seedPhoto.author);
    if (!authorId) throw new Error(`Unknown author ${seedPhoto.author}`);

    const scope = "photos" as const;
    await deletePhotoDirectory("photos", seedPhoto.id);
    await deletePhotoDirectory("quarantine", seedPhoto.id);
    const prepared = await preparePhoto(buffer, seedPhoto.id, scope);

    const takenAt = new Date(`${seedPhoto.takenAt}T12:00:00+08:00`);
    const acceptedAt = new Date(
      Date.now() - seedPhoto.daysAgo * 86_400_000 - index * 60_000,
    );
    const expiresAt = null;

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
        fileKey: prepared.fullKey,
        previewKey: prepared.previewKey,
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
          fileKey: prepared.fullKey,
          previewKey: prepared.previewKey,
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

  type SeedActivity = {
    id: string;
    slug: string;
    host: string;
    title: string;
    summary: string;
    description: string;
    region: string;
    routeName: string;
    meetingPoint: string;
    startDate: string;
    endDate: string;
    difficulty: string;
    joinPolicy: "approval" | "open" | "invite";
    visibility: "listed" | "unlisted" | "private";
    photoIds: string[];
    members: string[];
  };

  const seedActivities: SeedActivity[] = [
    {
      id: "b1000000-0000-4000-8000-000000000001",
      slug: "siguniang-changpinggou-2026",
      host: "linshen",
      title: "四姑娘山 · 长坪沟两日",
      summary: "走到木骡子，在雪山脚下住一晚，第二天原路回来。",
      description:
        "第一天从长坪沟口进山，走到木骡子扎营；第二天看完日照金山再慢慢下撤。\n集合点只在这里显示，请同行的人提前确认装备和补给。",
      region: "四川 · 小金",
      routeName: "长坪沟 — 木骡子",
      meetingPoint: "成都东站西广场，07:00 出发",
      startDate: "2026-09-20",
      endDate: "2026-09-21",
      difficulty: "moderate",
      joinPolicy: "approval",
      visibility: "listed",
      photoIds: [
        "a1000000-0000-4000-8000-000000000002",
        "a1000000-0000-4000-8000-000000000005",
        "a1000000-0000-4000-8000-000000000009",
      ],
      members: ["linshen", "alan", "mira"],
    },
    {
      id: "b1000000-0000-4000-8000-000000000002",
      slug: "coast-mountains-fog",
      host: "mira",
      title: "海岸山脉 · 雾林清晨",
      summary: "趁雾还没散，沿旧伐木道走进冷杉林。",
      description: "一条轻松的清晨线路，来回约四小时。适合第一次一起走的人。",
      region: "BC · Squamish",
      routeName: "Old Logging Road",
      meetingPoint: "Trailhead 停车场，06:30",
      startDate: "2026-10-18",
      endDate: "2026-10-18",
      difficulty: "easy",
      joinPolicy: "approval",
      visibility: "listed",
      photoIds: [
        "a1000000-0000-4000-8000-000000000008",
        "a1000000-0000-4000-8000-000000000015",
      ],
      members: ["mira", "linshen"],
    },
    {
      id: "b1000000-0000-4000-8000-000000000003",
      slug: "xishan-night-2026",
      host: "zhouye",
      title: "西山夜爬 · 等一场银河",
      summary: "傍晚出发，山顶等银河升起，凌晨下撤。",
      description: "带头灯和保暖层。山顶风大，记得多带一件。",
      region: "云南 · 昆明",
      routeName: "西山 — 猫猫箐",
      meetingPoint: "西山公园地铁站 A 口，19:30",
      startDate: "2026-11-08",
      endDate: "2026-11-09",
      difficulty: "moderate",
      joinPolicy: "approval",
      visibility: "listed",
      photoIds: [],
      members: ["zhouye", "laobai"],
    },
  ];

  for (const seedActivity of seedActivities) {
    const hostId = userIds.get(seedActivity.host);
    if (!hostId) throw new Error(`Unknown host ${seedActivity.host}`);

    await db
      .insert(activities)
      .values({
        id: seedActivity.id,
        slug: seedActivity.slug,
        hostId,
        title: seedActivity.title,
        summary: seedActivity.summary,
        description: seedActivity.description,
        region: seedActivity.region,
        routeName: seedActivity.routeName,
        meetingPoint: seedActivity.meetingPoint,
        startDate: seedActivity.startDate,
        endDate: seedActivity.endDate,
        difficulty: seedActivity.difficulty,
        joinPolicy: seedActivity.joinPolicy,
        visibility: seedActivity.visibility,
        status: "open",
      })
      .onConflictDoUpdate({
        target: activities.id,
        set: {
          slug: seedActivity.slug,
          hostId,
          title: seedActivity.title,
          summary: seedActivity.summary,
          description: seedActivity.description,
          region: seedActivity.region,
          routeName: seedActivity.routeName,
          meetingPoint: seedActivity.meetingPoint,
          startDate: seedActivity.startDate,
          endDate: seedActivity.endDate,
          difficulty: seedActivity.difficulty,
          joinPolicy: seedActivity.joinPolicy,
          visibility: seedActivity.visibility,
          status: "open",
        },
      });

    for (const username of seedActivity.members) {
      const memberId = userIds.get(username);
      if (!memberId) continue;
      await db
        .insert(activityMembers)
        .values({
          activityId: seedActivity.id,
          userId: memberId,
          role: memberId === hostId ? "host" : "member",
          status: "approved",
          decidedAt: new Date(),
          decidedBy: hostId,
        })
        .onConflictDoUpdate({
          target: [activityMembers.activityId, activityMembers.userId],
          set: {
            role: memberId === hostId ? "host" : "member",
            status: "approved",
          },
        });
    }

    if (seedActivity.photoIds.length > 0) {
      await db
        .update(photos)
        .set({ activityId: seedActivity.id, visibility: "activity" })
        .where(inArray(photos.id, seedActivity.photoIds));
    }

    console.log(`  activity ${seedActivity.title} · ${seedActivity.members.length} members`);
  }

  const counts = await db.select({ id: photos.id }).from(photos);
  console.log(`✓ seed complete · ${counts.length} archive records`);
  if (randomPasswords) {
    console.log("  production seed: all demo accounts use random passwords (not shown)");
  } else {
    console.log(`  demo login: hiker@gohiking.club / ${DEMO_PASSWORD}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

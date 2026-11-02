#!/usr/bin/env node
/*
 * One-off migration for photos uploaded before preview_key existed.
 * Generates a 1280px WebP preview from the largest stored photo file.
 * New uploads already write preview.webp and never need this script.
 *
 * Run after the 0002 migration:
 *   DATABASE_URL=... MEDIA_ROOT=/data/media node scripts/backfill-previews.cjs
 */
const { readFile, writeFile, mkdir } = require("node:fs/promises");
const path = require("node:path");
const { Client } = require("pg");
const sharp = require("sharp");

const root = path.resolve(process.env.MEDIA_ROOT || path.join(process.cwd(), "storage"));
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

function safeMediaPath(key) {
  const resolved = path.resolve(root, key);
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`media key escapes root: ${key}`);
  }
  return resolved;
}

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  const { rows } = await client.query(
    `select id, file_key, preview_key, thumb_key
       from photos
      where preview_key is null or preview_key = ''
      order by created_at asc`,
  );

  console.log(`preview backfill: ${rows.length} photo(s)`);
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const sourceKey = row.file_key || row.thumb_key;
    if (!sourceKey) {
      skipped += 1;
      console.log(`  skip ${row.id}: no source file`);
      continue;
    }

    try {
      const source = await readFile(safeMediaPath(sourceKey));
      const preview = await sharp(source)
        .rotate()
        .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 76, effort: 4 })
        .toBuffer();

      const previewKey = path.posix.join(path.posix.dirname(sourceKey), "preview.webp");
      const destination = safeMediaPath(previewKey);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, preview);
      await client.query("update photos set preview_key = $1 where id = $2", [previewKey, row.id]);

      created += 1;
      console.log(`  preview ${row.id}: ${preview.byteLength} bytes`);
    } catch (error) {
      skipped += 1;
      console.error(`  failed ${row.id}:`, error instanceof Error ? error.message : error);
    }
  }

  await client.end();
  console.log(`preview backfill complete: ${created} created, ${skipped} skipped`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

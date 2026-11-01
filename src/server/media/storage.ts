import { constants } from "node:fs";
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type MediaScope = "photos" | "quarantine";

const root = path.resolve(
  /* turbopackIgnore: true */ process.env.MEDIA_ROOT ?? path.join(process.cwd(), "storage"),
);

export function mediaRoot() {
  return root;
}

export function scopeRoot(scope: MediaScope) {
  return path.join(/* turbopackIgnore: true */ root, scope);
}

export async function ensureStorage() {
  await Promise.all([
    mkdir(scopeRoot("photos"), { recursive: true }),
    mkdir(scopeRoot("quarantine"), { recursive: true }),
    mkdir(path.join(root, "tmp"), { recursive: true }),
  ]);
}

export function resolveMediaPath(key: string) {
  if (!key || path.isAbsolute(key)) {
    throw new Error("Invalid media key");
  }
  const resolved = path.resolve(root, key);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Media key escapes storage root");
  }
  return resolved;
}

export async function writeMedia(key: string, data: Buffer) {
  const filePath = resolveMediaPath(key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
  return key;
}

export async function readMedia(key: string) {
  return readFile(/* turbopackIgnore: true */ resolveMediaPath(key));
}

export async function moveMedia(fromKey: string, toKey: string) {
  const from = resolveMediaPath(fromKey);
  const to = resolveMediaPath(toKey);
  await mkdir(path.dirname(to), { recursive: true });
  await rename(from, to);
  return toKey;
}

export async function deleteMedia(keys: (string | null | undefined)[]) {
  await Promise.all(
    keys.filter((key): key is string => Boolean(key)).map(async (key) => {
      try {
        await rm(resolveMediaPath(key), { force: true });
      } catch {
        // Cleanup is best effort. Orphan sweep can catch leftovers.
      }
    }),
  );
}

export async function deletePhotoDirectory(scope: MediaScope, photoId: string) {
  await rm(path.join(/* turbopackIgnore: true */ scopeRoot(scope), photoId), {
    recursive: true,
    force: true,
  });
}

export async function mediaExists(key: string) {
  try {
    await access(resolveMediaPath(key), constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export function photoMediaKey(scope: MediaScope, photoId: string, variant: "display" | "thumb" | "blur") {
  return path.posix.join(scope, photoId, `${variant}.webp`);
}

const RESERVED_HANDLES = new Set([
  "admin",
  "api",
  "archive",
  "gohiking",
  "help",
  "hikers",
  "login",
  "photo",
  "register",
  "root",
  "studio",
  "support",
  "www",
]);

/**
 * Registration only asks for an email and a password. Everything a public
 * profile needs is derived from the email and can be edited later in studio.
 */
export function deriveIdentity(email: string) {
  const local = (email.split("@")[0] ?? "").trim().toLowerCase();
  const words = local.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  const name = words
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ")
    .slice(0, 24);

  let handle = local.replace(/[^a-z0-9_]/g, "").slice(0, 16);
  if (handle.length < 3) handle = `hiker${handle}`;
  if (RESERVED_HANDLES.has(handle)) handle = `${handle}_${randomSuffix(3)}`;

  return {
    name: name || "徒步者",
    username: handle,
  };
}

export function randomSuffix(length = 4) {
  return Math.random().toString(36).slice(2, 2 + length).padEnd(length, "0");
}

export function withHandleSuffix(handle: string) {
  return `${handle.slice(0, 20 - 4)}${randomSuffix(4)}`.slice(0, 20);
}

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  username: string;
  bio?: string | null;
  homeBase?: string | null;
  createdAt: Date;
};

async function resolveSession() {
  return auth.api.getSession({ headers: await headers() });
}

export const getSession = cache(resolveSession);

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getSession();
  return (session?.user as SessionUser | undefined) ?? null;
});

export async function requireUser(nextPath = "/studio"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}

export async function getSessionFromRequest(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export async function requireApiUser(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.user) {
    return null;
  }
  return session.user as SessionUser;
}

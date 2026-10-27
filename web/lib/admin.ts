import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

const COOKIE = "eicr_admin";
const WEEK = 60 * 60 * 24 * 7;

const password = () => {
  const p = process.env.ADMIN_PASSWORD ?? "";
  return p.length >= 8 ? p : "";
};
export const adminConfigured = () => Boolean(password());

const sessionToken = () => createHmac("sha256", password()).update("eicr-admin-session").digest("hex");
const same = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export async function isAdmin() {
  const value = (await cookies()).get(COOKIE)?.value;
  return adminConfigured() && Boolean(value) && same(value!, sessionToken());
}

// Wrong passwords per visitor. Kept in memory, so each server instance counts separately.
const failures = new Map<string, { count: number; since: number }>();
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

async function visitor() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export async function lockedOut() {
  const f = failures.get(await visitor());
  return Boolean(f && f.count >= MAX_FAILURES && Date.now() - f.since < LOCK_MS);
}

export async function logIn(attempt: string) {
  const ip = await visitor();
  if (!adminConfigured() || !same(attempt, password())) {
    const f = failures.get(ip);
    failures.set(ip, f && Date.now() - f.since < LOCK_MS ? { count: f.count + 1, since: f.since } : { count: 1, since: Date.now() });
    if (failures.size > 5000) failures.clear();
    return false;
  }
  failures.delete(ip);
  (await cookies()).set(COOKIE, sessionToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: WEEK });
  return true;
}

export async function logOut() {
  (await cookies()).delete(COOKIE);
}

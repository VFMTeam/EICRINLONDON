import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

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

export async function logIn(attempt: string) {
  if (!adminConfigured() || !same(attempt, password())) return false;
  (await cookies()).set(COOKIE, sessionToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: WEEK });
  return true;
}

export async function logOut() {
  (await cookies()).delete(COOKIE);
}

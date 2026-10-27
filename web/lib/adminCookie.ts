// Admin login cookie. Browsers keep a cookie for at most about 400 days, so it
// is renewed on every admin visit (see middleware.ts) and in practice never expires.
// Changing ADMIN_PASSWORD signs out every device.
export const ADMIN_COOKIE = "eicr_admin";

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 400,
};

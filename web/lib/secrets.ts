import { get, put } from "@vercel/blob";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { blobConfigured } from "@/lib/blob";

// API keys set from /admin/. Kept in a private Blob file, never sent to the
// browser. A key saved here wins over the matching Vercel environment variable.
export const SECRET_KEYS = {
  stripeSecretKey: "STRIPE_SECRET_KEY",
  stripeWebhookSecret: "STRIPE_WEBHOOK_SECRET",
  resendApiKey: "RESEND_API_KEY",
} as const;
export type SecretName = keyof typeof SECRET_KEYS;
export type SecretStatus = Record<SecretName, { source: "admin" | "vercel" | ""; hint: string }>;

const BLOB_PATH = "admin/secrets.json";
const TAG = "site-secrets";

async function readStored(): Promise<Partial<Record<SecretName, string>>> {
  if (!blobConfigured()) return {};
  const res = await get(BLOB_PATH, { access: "private", useCache: false }).catch(() => null);
  return res?.stream ? await new Response(res.stream).json() : {};
}

const cachedStored = unstable_cache(readStored, [TAG], { tags: [TAG] });
const stored = () => cachedStored().catch(() => ({}) as Partial<Record<SecretName, string>>);

export async function getSecret(name: SecretName) {
  return (await stored())[name] || process.env[SECRET_KEYS[name]] || "";
}

export async function secretStatus(): Promise<SecretStatus> {
  const s = await stored();
  const status = {} as SecretStatus;
  for (const [name, env] of Object.entries(SECRET_KEYS) as [SecretName, string][]) {
    const value = s[name] || process.env[env] || "";
    status[name] = { source: s[name] ? "admin" : value ? "vercel" : "", hint: value ? `••••${value.slice(-4)}` : "" };
  }
  return status;
}

// Only fields with a value are changed; "-" clears a saved key.
export async function saveSecrets(changes: Partial<Record<SecretName, string>>) {
  const next = { ...(await readStored()) };
  for (const name of Object.keys(SECRET_KEYS) as SecretName[]) {
    const v = changes[name]?.trim();
    if (!v) continue;
    if (v === "-") delete next[name];
    else next[name] = v.slice(0, 300);
  }
  await put(BLOB_PATH, JSON.stringify(next), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
  revalidateTag(TAG);
  revalidatePath("/", "layout");
}

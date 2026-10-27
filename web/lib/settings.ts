import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { normaliseSettings, type Settings } from "@/lib/pricing";
import { services, type Service } from "@/lib/services";

// Prices edited in /admin/ are kept in Vercel Blob. Without a Blob store the
// site uses the built-in prices, and local development saves to .data/.
const BLOB_PATH = "admin/settings.json";
const LOCAL_FILE = path.join(process.cwd(), ".data", "settings.json");
const TAG = "site-settings";

export const storageReady = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN) || process.env.NODE_ENV !== "production";

async function readStored(): Promise<unknown> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    let failures = 0;
    for (const access of ["private", "public"] as const) {
      try {
        const res = await get(BLOB_PATH, { access, useCache: false });
        if (res?.stream) return await new Response(res.stream).json();
      } catch {
        failures++;
      }
    }
    // Never fall back to the built-in prices because of a network error.
    if (failures === 2) throw new Error("Could not read saved prices");
    return null;
  }
  if (process.env.NODE_ENV === "production") return null;
  try {
    return JSON.parse(await readFile(LOCAL_FILE, "utf8"));
  } catch {
    return null;
  }
}

const cachedStored = unstable_cache(readStored, [TAG], { tags: [TAG] });

export async function getSettings(): Promise<Settings> {
  return normaliseSettings(await cachedStored());
}

export async function saveSettings(settings: Settings) {
  const body = JSON.stringify(normaliseSettings(settings), null, 2);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    let saved = false;
    for (const access of ["private", "public"] as const) {
      try {
        await put(BLOB_PATH, body, { access, addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 });
        saved = true;
        break;
      } catch {}
    }
    if (!saved) throw new Error("Blob store rejected the save");
  } else {
    await mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await writeFile(LOCAL_FILE, body);
  }
  revalidateTag(TAG);
  revalidatePath("/", "layout");
}

export async function pricedServices(): Promise<Service[]> {
  const { prices } = await getSettings();
  return services.map((s) => ({ ...s, price: prices[s.slug] ?? s.price }));
}

export async function pricedService(slug: string) {
  return (await pricedServices()).find((s) => s.slug === slug);
}

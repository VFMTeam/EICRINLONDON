import { randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, list, put } from "@vercel/blob";
import { blobConfigured } from "@/lib/blob";
import { revalidateTag, unstable_cache } from "next/cache";

// A short record of each booking for the admin overview, one JSON file per
// booking in Vercel Blob under bookings/. Local development uses .data/bookings/.
export type BookingMethod = "card" | "bank" | "cash" | "request";
export type BookingRecord = { id: string; at: string; visit: string; services: string[]; total: number; method: BookingMethod; name: string; postcode: string };

const LOCAL_DIR = path.join(process.cwd(), ".data", "bookings");
const ACCESS = ["private", "public"] as const;
const TAG = "bookings";
const blob = blobConfigured;

export async function recordBooking(input: Omit<BookingRecord, "id" | "at">, id = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`) {
  const record: BookingRecord = { ...input, id: id.replace(/[^\w-]/g, "").slice(0, 80), at: new Date().toISOString() };
  const body = JSON.stringify(record);
  try {
    if (blob()) {
      for (const access of ACCESS) {
        try {
          await put(`bookings/${record.id}.json`, body, { access, addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
          revalidateTag(TAG);
          return;
        } catch {}
      }
    } else if (process.env.NODE_ENV !== "production") {
      await mkdir(LOCAL_DIR, { recursive: true });
      await writeFile(path.join(LOCAL_DIR, `${record.id}.json`), body);
    }
  } catch (e) {
    console.error("Could not record booking", e);
  }
}

async function readBlob(pathname: string): Promise<BookingRecord | null> {
  for (const access of ACCESS) {
    try {
      const res = await get(pathname, { access, useCache: false });
      if (res?.stream) return await new Response(res.stream).json();
    } catch {}
  }
  return null;
}

export async function listBookings(): Promise<BookingRecord[]> {
  let records: (BookingRecord | null)[] = [];
  if (blob()) {
    const names: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: "bookings/", cursor });
      names.push(...page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    records = await Promise.all(names.map(readBlob));
  } else if (process.env.NODE_ENV !== "production") {
    const files = await readdir(LOCAL_DIR).catch(() => []);
    records = await Promise.all(files.map((f) => readFile(path.join(LOCAL_DIR, f), "utf8").then(JSON.parse, () => null)));
  }
  return records.filter((r): r is BookingRecord => Boolean(r?.id)).sort((a, b) => b.at.localeCompare(a.at));
}

export const cachedBookings = unstable_cache(listBookings, [TAG], { tags: [TAG], revalidate: 86400 });

async function countBookings() {
  if (blob()) {
    let count = 0;
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: "bookings/", cursor });
      count += page.blobs.length;
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return count;
  }
  if (process.env.NODE_ENV === "production") return 0;
  return (await readdir(LOCAL_DIR).catch(() => [])).length;
}

export const bookingCount = unstable_cache(countBookings, ["booking-count"], { tags: [TAG], revalidate: 86400 });

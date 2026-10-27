import { randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, list, put } from "@vercel/blob";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

// Each review is one JSON file in Vercel Blob under reviews/pending/ or
// reviews/approved/. Local development saves to .data/reviews/.
export type ReviewStatus = "pending" | "approved";
export type Review = { id: string; name: string; service: string; rating: number; text: string; createdAt: string };

const TAGS = { pending: "pending-reviews", approved: "approved-reviews" } as const;
const LOCAL_DIR = path.join(process.cwd(), ".data", "reviews");
const ACCESS = ["private", "public"] as const;
const blob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const fileName = (status: ReviewStatus, id: string) => `reviews/${status}/${id}.json`;

export const reviewStorageReady = () => blob() || process.env.NODE_ENV !== "production";

async function writeReview(status: ReviewStatus, review: Review) {
  const body = JSON.stringify(review);
  if (!blob()) {
    await mkdir(path.join(LOCAL_DIR, status), { recursive: true });
    return writeFile(path.join(LOCAL_DIR, status, `${review.id}.json`), body);
  }
  for (const access of ACCESS) {
    try {
      await put(fileName(status, review.id), body, { access, addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 });
      return;
    } catch {}
  }
  throw new Error("Blob store rejected the review");
}

async function readBlob(pathname: string): Promise<Review | null> {
  for (const access of ACCESS) {
    try {
      const res = await get(pathname, { access, useCache: false });
      if (res?.stream) return await new Response(res.stream).json();
    } catch {}
  }
  return null;
}

async function removeReview(status: ReviewStatus, id: string) {
  if (blob()) return del(fileName(status, id));
  await rm(path.join(LOCAL_DIR, status, `${id}.json`), { force: true });
}

export async function listReviews(status: ReviewStatus): Promise<Review[]> {
  let reviews: (Review | null)[] = [];
  if (blob()) {
    const names: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: `reviews/${status}/`, cursor });
      names.push(...page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    reviews = await Promise.all(names.map(readBlob));
  } else if (process.env.NODE_ENV !== "production") {
    const dir = path.join(LOCAL_DIR, status);
    const files = await readdir(dir).catch(() => []);
    reviews = await Promise.all(files.map((f) => readFile(path.join(dir, f), "utf8").then(JSON.parse, () => null)));
  }
  return reviews.filter((r): r is Review => Boolean(r?.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const cached = (status: ReviewStatus) => unstable_cache(() => listReviews(status), [TAGS[status]], { tags: [TAGS[status]], revalidate: 86400 });
export const cachedReviews = { pending: cached("pending"), approved: cached("approved") };
export const approvedReviews = () => cachedReviews.approved().catch(() => [] as Review[]);

export async function addReview(input: Omit<Review, "id" | "createdAt">) {
  const review: Review = { ...input, id: `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`, createdAt: new Date().toISOString() };
  await writeReview("pending", review);
  revalidateTag(TAGS.pending);
  return review;
}

function refresh(status: ReviewStatus) {
  revalidateTag(TAGS[status]);
  if (status === "approved") revalidatePath("/");
}

export async function approveReview(id: string) {
  const review = (await listReviews("pending")).find((r) => r.id === id);
  if (!review) return false;
  await writeReview("approved", review);
  await removeReview("pending", id);
  refresh("pending");
  refresh("approved");
  return true;
}

export async function deleteReview(status: ReviewStatus, id: string) {
  await removeReview(status, id);
  refresh(status);
}

import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Short link to send customers after a job so they can leave a Google review.
export async function GET() {
  redirect((await getSettings()).links.googleReview || process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || "/");
}

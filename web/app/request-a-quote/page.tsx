import type { Metadata } from "next";
import { pageMeta } from "@/lib/content";
import { quoteFormHtml } from "@/lib/quoteForm";

export const metadata: Metadata = {
  title: { absolute: pageMeta["request-a-quote"].title },
  description: pageMeta["request-a-quote"].description,
  alternates: { canonical: "/request-a-quote/" },
};

export default async function RequestQuotePage({ searchParams }: { searchParams: Promise<{ service?: string | string[] }> }) {
  const { service } = await searchParams;
  return <main id="main-content" dangerouslySetInnerHTML={{ __html: await quoteFormHtml(service) }} />;
}

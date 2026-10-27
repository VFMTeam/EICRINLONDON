import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readPartial, pageMeta, type PageKey } from "@/lib/content";
import { verifyHtml } from "@/components/VerifyRegistration";

// Simple content pages carried over from the original site.
const slugs = ["about", "contact", "privacy", "cookies", "terms"] as const;
type Slug = (typeof slugs)[number];

export function generateStaticParams() {
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const meta = pageMeta[slug as PageKey];
  return meta ? { title: { absolute: meta.title }, description: meta.description, alternates: { canonical: `/${slug}/` } } : {};
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slugs.includes(slug as Slug)) notFound();
  return <main id="main-content" dangerouslySetInnerHTML={{ __html: readPartial(`pages/${slug}`).replace("{{verify}}", verifyHtml) }} />;
}

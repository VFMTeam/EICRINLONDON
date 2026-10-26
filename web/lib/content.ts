import { readFileSync } from "node:fs";
import path from "node:path";
import meta from "@/content/meta.json";

// HTML partials carried over from the WordPress theme. They are read at build
// time, so every page is pre-rendered as static HTML.
export function readPartial(name: string) {
  return readFileSync(path.join(process.cwd(), "content", `${name}.html`), "utf8");
}

export type PageKey = keyof typeof meta;

export const pageMeta = meta as Record<PageKey, { title: string; description: string }>;

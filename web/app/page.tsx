import { readPartial } from "@/lib/content";

export default function HomePage() {
  return <main id="main-content" dangerouslySetInnerHTML={{ __html: readPartial("pages/home") }} />;
}

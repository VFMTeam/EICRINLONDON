import { readPartial } from "@/lib/content";
import Reviews from "@/components/Reviews";

export default function HomePage() {
  const [top, rest] = readPartial("pages/home").split("<!-- reviews -->");
  return (
    <main id="main-content">
      <div className="contents" dangerouslySetInnerHTML={{ __html: top }} />
      <Reviews />
      <div className="contents" dangerouslySetInnerHTML={{ __html: rest }} />
    </main>
  );
}

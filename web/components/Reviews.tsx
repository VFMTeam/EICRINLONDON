import { reviews, type Review } from "@/lib/reviews";
import { services } from "@/lib/services";
import ReviewForm from "@/components/ReviewForm";

function Card({ r }: { r: Review }) {
  const rating = Math.max(1, Math.min(5, Math.round(r.rating)));
  return (
    <figure className="rv-card">
      <div className="rv-card-top">
        <span className="rv-stars" aria-label={`${rating} out of 5 stars`}>
          {"★".repeat(rating) + "☆".repeat(5 - rating)}
        </span>
        <span className="rv-label">Customer review</span>
      </div>
      <blockquote>&ldquo;{r.text}&rdquo;</blockquote>
      <figcaption>
        <span className="rv-initial">{r.name.charAt(0).toUpperCase()}</span>
        <span>
          <strong>{r.name}</strong>
          <small>{r.service || "Customer"}</small>
        </span>
      </figcaption>
    </figure>
  );
}

export default function Reviews() {
  const cards = reviews.map((r, i) => <Card key={i} r={r} />);
  return (
    <section id="customer-reviews" className="rv-section" aria-labelledby="eicr-reviews-title">
      <div className="rv-head">
        <p className="rv-kicker">Feedback from our London customers</p>
        <h2 id="eicr-reviews-title">Recent customer experiences</h2>
        {reviews.length > 0 && (
          <p className="rv-count">
            <span>{reviews.length}</span> {reviews.length === 1 ? "published review" : "published reviews"}
          </p>
        )}
      </div>
      {cards.length > 0 &&
        (cards.length < 4 ? (
          <div className="rv-row">{cards}</div>
        ) : (
          <div className="rv-viewport">
            <div className="rv-marquee" style={{ "--rv-duration": `${Math.max(36, Math.min(180, cards.length * 6))}s` } as React.CSSProperties}>
              <div className="rv-set">{cards}</div>
              <div className="rv-set" aria-hidden="true">{cards}</div>
            </div>
          </div>
        ))}
      <div className="rv-actions">
        <ReviewForm services={services.map((s) => s.title)} />
      </div>
    </section>
  );
}

import ReviewForm from "@/components/ReviewForm";
import { approvedReviews, reviewStorageReady, type Review } from "@/lib/reviews";
import { services } from "@/lib/services";

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="review-card">
      <span className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{stars(review.rating)}</span>
      <blockquote>&ldquo;{review.text}&rdquo;</blockquote>
      <figcaption>
        <span className="review-initial" aria-hidden="true">{review.name.charAt(0).toUpperCase()}</span>
        <span>
          <strong>{review.name}</strong>
          <small>{review.service}</small>
        </span>
      </figcaption>
    </figure>
  );
}

export default async function Reviews() {
  const reviews = await approvedReviews();
  const scrolling = reviews.length >= 4;
  const cards = reviews.map((r) => <ReviewCard key={r.id} review={r} />);
  if (!reviews.length && !reviewStorageReady()) return null;

  return (
    <section id="customer-reviews" className="reviews-section" aria-labelledby="reviews-title">
      <div className="reviews-head">
        <p>Feedback from our London customers</p>
        <h2 id="reviews-title">Recent customer experiences</h2>
      </div>
      {reviews.length > 0 &&
        (scrolling ? (
          <div className="reviews-viewport">
            <div className="reviews-marquee" style={{ "--reviews-duration": `${Math.min(180, Math.max(36, reviews.length * 6))}s` } as React.CSSProperties}>
              <div className="reviews-set">{cards}</div>
              <div className="reviews-set" aria-hidden="true">{cards}</div>
            </div>
          </div>
        ) : (
          <div className="reviews-static">{cards}</div>
        ))}
      {reviewStorageReady() && <ReviewForm services={services.map((s) => s.title)} />}
    </section>
  );
}

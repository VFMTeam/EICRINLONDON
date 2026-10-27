import { reviews, type Review } from "@/lib/reviews";
import { services } from "@/lib/services";

function Card({ r }: { r: Review }) {
  const rating = Math.max(1, Math.min(5, Math.round(r.rating)));
  return (
    <figure className="flex h-48 w-[290px] shrink-0 flex-col rounded-2xl border border-line bg-white p-5 sm:w-[330px]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm tracking-wider text-amber-500" aria-label={`${rating} out of 5 stars`}>
          {"★".repeat(rating) + "☆".repeat(5 - rating)}
        </span>
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Customer review</span>
      </div>
      <blockquote className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">&ldquo;{r.text}&rdquo;</blockquote>
      <figcaption className="mt-auto flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gold text-sm font-black text-ink">{r.name.charAt(0).toUpperCase()}</span>
        <span>
          <strong className="block text-sm text-ink">{r.name}</strong>
          <small className="text-xs text-muted">{r.service || "Customer"}</small>
        </span>
      </figcaption>
    </figure>
  );
}

export default function Reviews() {
  const cards = reviews.map((r, i) => <Card key={i} r={r} />);
  return (
    <>
      <section id="customer-reviews" className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="eicr-reviews-title">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-black uppercase tracking-widest text-amber-600">Feedback from our London customers</p>
          <h2 id="eicr-reviews-title" className="mt-2 text-3xl font-black sm:text-4xl">Recent customer experiences</h2>
          {reviews.length > 0 && (
            <p className="mt-3 font-bold text-slate-600">
              <span className="text-amber-600">{reviews.length}</span> {reviews.length === 1 ? "published review" : "published reviews"}
            </p>
          )}
        </div>
        {cards.length > 0 && (
          <div className="mt-8">
            {cards.length < 4 ? (
              <div className="flex flex-wrap justify-center gap-4">{cards}</div>
            ) : (
              <div className="eicr-review-viewport overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
                <div className="review-marquee flex w-max gap-4" style={{ "--eicr-review-duration": `${Math.max(36, Math.min(180, cards.length * 6))}s` } as React.CSSProperties}>
                  <div className="review-marquee-set flex gap-4">{cards}</div>
                  <div aria-hidden="true" className="review-marquee-set flex gap-4">{cards}</div>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="mt-5 text-center">
          <button type="button" data-open-review className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800">
            Add your review
          </button>
        </div>
      </section>

      <div id="eicr-review-modal" className="eicr-review-modal" hidden>
        <div className="eicr-review-dialog" role="dialog" aria-modal="true" aria-labelledby="eicr-review-title">
          <button type="button" className="eicr-review-close" data-close-modal aria-label="Close review form">
            &times;
          </button>
          <p className="text-xs font-black uppercase tracking-widest text-amber-600">Customer feedback</p>
          <h2 id="eicr-review-title" className="mt-2 text-2xl font-black">Share your experience</h2>
          <form className="eicr-form eicr-review-form">
            <label>
              Your name
              <input type="text" name="name" maxLength={80} autoComplete="name" required data-modal-focus />
            </label>
            <div className="eicr-grid">
              <label>
                Service used
                <select name="service" required defaultValue="">
                  <option value="">Choose a service</option>
                  {services.map((s) => (
                    <option key={s.slug} value={s.title}>{s.title}</option>
                  ))}
                </select>
              </label>
              <label>
                Rating
                <select name="rating" required defaultValue="5">
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Very good</option>
                  <option value="3">3 - Good</option>
                  <option value="2">2 - Fair</option>
                  <option value="1">1 - Poor</option>
                </select>
              </label>
            </div>
            <label>
              Your review
              <textarea name="review" rows={4} maxLength={1500} required />
            </label>
            <input className="eicr-review-hp" type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <input type="hidden" name="action" value="eicr_submit_review" />
            <button type="submit">Submit</button>
            <p className="eicr-response" aria-live="polite"></p>
            <button type="button" className="eicr-review-again">Write another review</button>
          </form>
        </div>
      </div>
    </>
  );
}

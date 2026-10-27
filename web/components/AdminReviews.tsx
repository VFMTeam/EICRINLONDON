import { moderateReview } from "@/app/admin/actions";
import type { Review } from "@/lib/reviews";

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });

function Item({ review, actions }: { review: Review; actions: [string, string][] }) {
  return (
    <div className="admin-review">
      <strong>{"★".repeat(review.rating) + "☆".repeat(5 - review.rating)} {review.name}</strong> <small>{review.service} · {date(review.createdAt)}</small>
      <p>{review.text}</p>
      <div className="admin-review-actions">
        {actions.map(([value, label]) => (
          <form key={value} action={moderateReview}>
            <input type="hidden" name="id" value={review.id} />
            <input type="hidden" name="decision" value={value} />
            <button type="submit" className={value === "approve" ? "admin-save" : "admin-reject"}>{label}</button>
          </form>
        ))}
      </div>
    </div>
  );
}

export default function AdminReviews({ pending, approved }: { pending: Review[]; approved: Review[] }) {
  return (
    <div className="admin-form">
      <section className="admin-card">
        <h2>Reviews waiting for approval</h2>
        {pending.length ? pending.map((r) => <Item key={r.id} review={r} actions={[["approve", "Approve"], ["reject", "Reject"]]} />) : <p className="admin-hint">No new reviews.</p>}
      </section>
      {approved.length > 0 && (
        <section className="admin-card">
          <h2>Reviews on the website</h2>
          {approved.map((r) => <Item key={r.id} review={r} actions={[["remove", "Remove"]]} />)}
        </section>
      )}
    </div>
  );
}

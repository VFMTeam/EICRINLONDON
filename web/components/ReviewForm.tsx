"use client";

import { useRef, useState } from "react";

export default function ReviewForm({ services }: { services: string[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);

  function open() {
    setStatus(null);
    dialog.current?.showModal();
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSending(true);
    try {
      const res = await fetch("/api/reviews/", { method: "POST", body: new FormData(form) });
      const data = await res.json();
      setStatus({ ok: Boolean(data.success), message: data.message });
      if (data.success) form.reset();
    } catch {
      setStatus({ ok: false, message: "Sorry, your review could not be sent. Please try again." });
    }
    setSending(false);
  }

  return (
    <div className="reviews-action">
      <button type="button" className="reviews-open" onClick={open}>Write a review</button>
      <dialog ref={dialog} className="review-dialog" aria-labelledby="review-dialog-title" onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <button type="button" className="review-close" onClick={() => dialog.current?.close()} aria-label="Close">×</button>
        <h2 id="review-dialog-title">Share your experience</h2>
        {status?.ok ? (
          <div className="review-done" role="status">
            <span className="review-like" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></svg>
            </span>
            <strong>{status.message}</strong>
            <p>We&rsquo;re really happy you took the time to share your experience.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="review-form">
            <label>
              <span className="label">Your name</span>
              <input className="field" name="name" maxLength={60} autoComplete="name" required />
            </label>
            <label>
              <span className="label">Service used</span>
              <select className="field" name="service" required defaultValue="">
                <option value="" disabled>Choose a service</option>
                {services.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <fieldset className="review-rating">
              <legend className="label">Rating</legend>
              <div className="review-stars-input">
                {[5, 4, 3, 2, 1].map((n) => (
                  <label key={n} title={`${n} out of 5`}>
                    <input type="radio" name="rating" value={n} required defaultChecked={n === 5} />
                    <span aria-hidden="true">★</span>
                    <span className="review-sr">{n} stars</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              <span className="label">Your review</span>
              <textarea className="field" name="review" rows={4} maxLength={1500} required />
            </label>
            <input className="eicr-review-hp" type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <label className="review-consent">
              <input type="checkbox" name="consent" value="yes" required />
              <span>I agree to my name and review being shown on this website.</span>
            </label>
            {status && <p className="review-error" role="alert">{status.message}</p>}
            <button type="submit" className="reviews-open" disabled={sending}>{sending ? "Sending…" : "Submit review"}</button>
          </form>
        )}
      </dialog>
    </div>
  );
}

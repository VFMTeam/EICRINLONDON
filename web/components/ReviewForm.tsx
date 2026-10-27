"use client";

import { useEffect, useRef, useState } from "react";

export default function ReviewForm({ services }: { services: string[] }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [message, setMessage] = useState("");
  const opener = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    opener.current?.focus();
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("sending");
    setMessage("Sending…");
    try {
      const res = await fetch("/api/forms/", { method: "POST", body: new FormData(form) });
      const data = await res.json();
      setMessage(data?.data?.message || "Please try again.");
      if (data?.success) {
        form.reset();
        setStatus("done");
      } else setStatus("idle");
    } catch {
      setMessage("Connection problem. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <>
      <button ref={opener} type="button" className="rv-add" onClick={() => setOpen(true)}>
        Add your review
      </button>
      {open && (
        <div className="eicr-review-modal" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="eicr-review-dialog" role="dialog" aria-modal="true" aria-labelledby="eicr-review-title">
            <button type="button" className="eicr-review-close" onClick={close} aria-label="Close review form">
              &times;
            </button>
            <p className="rv-kicker">Customer feedback</p>
            <h2 id="eicr-review-title" className="rv-dialog-title">Share your experience</h2>
            {status === "done" ? (
              <div className="rv-done">
                <p aria-live="polite">{message}</p>
                <button type="button" onClick={() => { setStatus("idle"); setMessage(""); }}>
                  Write another review
                </button>
              </div>
            ) : (
              <form className="eicr-form eicr-review-form" onSubmit={submit}>
                <label>
                  Your name
                  <input ref={first} type="text" name="name" maxLength={80} autoComplete="name" required />
                </label>
                <div className="eicr-grid">
                  <label>
                    Service used
                    <select name="service" required defaultValue="">
                      <option value="">Choose a service</option>
                      {services.map((s) => (
                        <option key={s} value={s}>{s}</option>
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
                <button type="submit" disabled={status === "sending"}>Submit</button>
                <p className="eicr-response" aria-live="polite">{message}</p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

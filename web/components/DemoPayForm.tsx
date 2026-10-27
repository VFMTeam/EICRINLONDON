"use client";

import { useState } from "react";

// Demo only: card 4242 4242 4242 4242 succeeds, anything else is declined.
export default function DemoPayForm({ amount, booking, email, name, postcode }: { amount: string; booking: string; email: string; name: string; postcode: string }) {
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const card = String(new FormData(e.currentTarget).get("card") ?? "").replace(/\D/g, "");
    if (card !== "4242424242424242") {
      setError("Your card was declined. In test mode use 4242 4242 4242 4242.");
      return;
    }
    setError("");
    setPaying(true);
    setTimeout(() => (window.location.href = `/booking/confirmed/?demo=${booking}`), 1200);
  }

  return (
    <form className="sc-form" onSubmit={pay}>
      <label className="sc-field">
        Email
        <input type="email" defaultValue={email} autoComplete="email" required />
      </label>
      <div className="sc-field">
        Card information
        <div className="sc-card">
          <input name="card" inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" aria-label="Card number" required />
          <div>
            <input name="exp" placeholder="MM / YY" autoComplete="cc-exp" aria-label="Expiry" required />
            <input name="cvc" inputMode="numeric" placeholder="CVC" autoComplete="cc-csc" aria-label="CVC" required />
          </div>
        </div>
      </div>
      <label className="sc-field">
        Cardholder name
        <input defaultValue={name} autoComplete="cc-name" required />
      </label>
      <label className="sc-field">
        Postcode
        <input defaultValue={postcode} autoComplete="postal-code" required />
      </label>
      {error && <p className="sc-error" role="alert">{error}</p>}
      <button type="submit" className="sc-button" disabled={paying}>
        {paying ? <span className="pay-spinner sc-button-spinner" /> : `Pay ${amount}`}
      </button>
    </form>
  );
}

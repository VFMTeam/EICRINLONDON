"use client";

import { useState } from "react";

const brands = (
  <span className="sc-brands" aria-hidden="true">
    <svg viewBox="0 0 38 24"><rect width="38" height="24" rx="3" fill="#1434cb" /><text x="19" y="16" fill="#fff" fontSize="10" fontWeight="800" fontStyle="italic" textAnchor="middle" fontFamily="Arial">VISA</text></svg>
    <svg viewBox="0 0 38 24"><rect width="38" height="24" rx="3" fill="#252525" /><circle cx="15" cy="12" r="7" fill="#eb001b" /><circle cx="23" cy="12" r="7" fill="#f79e1b" fillOpacity=".9" /></svg>
    <svg viewBox="0 0 38 24"><rect width="38" height="24" rx="3" fill="#016fd0" /><text x="19" y="15.5" fill="#fff" fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="Arial">AMEX</text></svg>
  </span>
);

// Demo only: card 4242 4242 4242 4242 succeeds, anything else is declined.
export default function DemoPayForm({ amount, booking, email, name, postcode }: { amount: string; booking: string; email: string; name: string; postcode: string }) {
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  function finish() {
    setError("");
    setPaying(true);
    setTimeout(() => (window.location.href = `/booking/confirmed/?demo=${booking}`), 1200);
  }

  function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const card = String(new FormData(e.currentTarget).get("card") ?? "").replace(/\D/g, "");
    if (card !== "4242424242424242") return setError("Your card was declined. In test mode use 4242 4242 4242 4242.");
    finish();
  }

  return (
    <form className="sc-form" onSubmit={pay}>
      <div className="sc-wallets">
        <button type="button" className="sc-apple" onClick={finish} disabled={paying}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8s-1.8-.8-3-.8C7 7.2 5.6 8.1 4.8 9.5c-1.6 2.8-.4 6.9 1.2 9.1.8 1.1 1.7 2.3 2.8 2.3 1.1 0 1.6-.7 2.9-.7 1.4 0 1.7.7 2.9.7 1.2 0 2-1.1 2.7-2.2.9-1.3 1.2-2.5 1.2-2.6 0 0-2.3-.9-2.3-3.5zM14.2 5.6c.6-.8 1-1.8.9-2.8-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.7-.9 2.7 1 .1 2-.5 2.6-1.3z" /></svg>
          Pay
        </button>
        <button type="button" className="sc-google" onClick={finish} disabled={paying}>
          <b><span style={{ color: "#4285f4" }}>G</span><span style={{ color: "#ea4335" }}>o</span><span style={{ color: "#fbbc05" }}>o</span><span style={{ color: "#4285f4" }}>g</span><span style={{ color: "#34a853" }}>l</span><span style={{ color: "#ea4335" }}>e</span></b> Pay
        </button>
      </div>
      <p className="sc-or"><span>Or pay with card</span></p>
      <label className="sc-field">
        Email
        <input type="email" defaultValue={email} autoComplete="email" required />
      </label>
      <div className="sc-field">
        Card information
        <div className="sc-card">
          <div className="sc-card-number">
            <input name="card" inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" aria-label="Card number" required />
            {brands}
          </div>
          <div className="sc-card-row">
            <input name="exp" placeholder="MM / YY" autoComplete="cc-exp" aria-label="Expiry" required />
            <input name="cvc" inputMode="numeric" placeholder="CVC" autoComplete="cc-csc" aria-label="CVC" required />
          </div>
        </div>
      </div>
      <div className="sc-card-row sc-split">
        <label className="sc-field">
          Name on card
          <input defaultValue={name} autoComplete="cc-name" required />
        </label>
        <label className="sc-field">
          Postcode
          <input defaultValue={postcode} autoComplete="postal-code" required />
        </label>
      </div>
      {error && <p className="sc-error" role="alert">{error}</p>}
      <button type="submit" className="sc-button" disabled={paying}>
        {paying ? (
          <span className="pay-spinner sc-button-spinner" />
        ) : (
          <>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 11h12v9H6zM9 11V8a3 3 0 016 0v3" /></svg>
            Pay {amount}
          </>
        )}
      </button>
    </form>
  );
}

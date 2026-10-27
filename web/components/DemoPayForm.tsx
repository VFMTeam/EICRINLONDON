"use client";

import { useState } from "react";

// Demo only: card 4242 4242 4242 4242 succeeds, anything else is declined.
export default function DemoPayForm({ amount, booking }: { amount: string; booking: string }) {
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const card = String(new FormData(e.currentTarget).get("card") ?? "").replace(/\D/g, "");
    if (card !== "4242424242424242") {
      setError("Card declined. In demo mode use 4242 4242 4242 4242.");
      return;
    }
    setPaying(true);
    setTimeout(() => (window.location.href = `/booking/confirmed/?demo=${booking}`), 900);
  }

  return (
    <form className="bk-demo-pay" onSubmit={pay}>
      <div className="bk-wallets">
        <button type="button" onClick={() => setError("Apple Pay and Google Pay appear here once the real payment account is connected.")}>Apple Pay</button>
        <button type="button" onClick={() => setError("Apple Pay and Google Pay appear here once the real payment account is connected.")}>Google Pay</button>
      </div>
      <p className="bk-or">or pay by card</p>
      <label className="bk-field">Card number<input name="card" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" required /></label>
      <div className="bk-grid">
        <label className="bk-field">Expiry<input name="exp" placeholder="MM / YY" autoComplete="cc-exp" required /></label>
        <label className="bk-field">CVC<input name="cvc" inputMode="numeric" placeholder="123" autoComplete="cc-csc" required /></label>
      </div>
      {error && <p className="bk-error" role="alert">{error}</p>}
      <button type="submit" className="bk-next" disabled={paying}>{paying ? "Processing…" : `Pay ${amount}`}</button>
    </form>
  );
}

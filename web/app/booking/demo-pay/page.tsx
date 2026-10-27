import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BookingSummary from "@/components/BookingSummary";
import DemoPayForm from "@/components/DemoPayForm";
import { decodeBooking, paymentMode } from "@/lib/booking";
import { gbp } from "@/lib/pricing";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

export default async function DemoPayPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  if (paymentMode() !== "demo") redirect("/booking/");
  const { b } = await searchParams;
  const booking = decodeBooking(b);
  if (!booking || !b) redirect("/booking/");

  return (
    <main id="main-content">
      <section className="core-page-shell">
        <div className="core-page-wrap">
          <header className="core-page-header">
            <p>Secure payment</p>
            <h1>Pay {gbp(booking.payNow)}</h1>
          </header>
          <p className="bk-demo-banner">Demo mode: no real payment is taken. Use card 4242 4242 4242 4242, any future date and any CVC.</p>
          <div className="bk-layout">
            <div className="bk-main">
              <DemoPayForm amount={gbp(booking.payNow)} booking={b} />
            </div>
            <BookingSummary b={booking} status="due" />
          </div>
        </div>
      </section>
    </main>
  );
}

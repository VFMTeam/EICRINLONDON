import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Book Online", robots: { index: false } };

export default function BookingPage() {
  return (
    <ComingSoon
      title="Online booking is being upgraded"
      text="Our new secure online booking with card, Apple Pay and Google Pay is almost ready. In the meantime, send a quote request or contact us and we will arrange your appointment."
    />
  );
}

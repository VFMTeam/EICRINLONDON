import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Customer Sign In", robots: { index: false } };

export default function SignInPage() {
  return (
    <ComingSoon
      title="Customer accounts are coming soon"
      text="You will soon be able to sign in to track bookings and download your certificates. Until then, contact our team and we will email your documents directly."
    />
  );
}

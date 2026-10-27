import type { Metadata } from "next";
import AdminApp from "@/components/AdminApp";
import AdminBookings from "@/components/AdminBookings";
import AdminLogin from "@/components/AdminLogin";
import AdminReviews from "@/components/AdminReviews";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { cachedBookings } from "@/lib/bookings";
import { cachedReviews } from "@/lib/reviews";
import { getSettings, storageReady } from "@/lib/settings";
import "./admin.css";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!adminConfigured()) {
    return (
      <main id="main-content" className="adm-page">
        <div className="adm-login">
          <img src="/images/logo.png" alt="" width={56} height={48} />
          <h1>Admin is switched off</h1>
          <p>Add ADMIN_PASSWORD (at least 8 characters) in Vercel, Settings, Environment Variables, then redeploy.</p>
        </div>
      </main>
    );
  }
  if (!(await isAdmin())) {
    return (
      <main id="main-content" className="adm-page">
        <AdminLogin />
      </main>
    );
  }
  const [pending, approved, bookings, settings] = await Promise.all([
    cachedReviews.pending().catch(() => []),
    cachedReviews.approved().catch(() => []),
    cachedBookings().catch(() => []),
    getSettings(),
  ]);
  return (
    <main id="main-content" className="adm-page">
      <AdminApp
        initial={settings}
        bookings={<AdminBookings bookings={bookings} gaId={settings.tracking.gaId} />}
        canSave={storageReady()} pendingReviews={pending.length} reviews={<AdminReviews pending={pending} approved={approved} />} />
    </main>
  );
}

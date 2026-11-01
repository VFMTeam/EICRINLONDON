import type { Metadata } from "next";
import AdminApp from "@/components/AdminApp";
import AdminBookingList from "@/components/AdminBookingList";
import AdminBookings from "@/components/AdminBookings";
import AdminLogin from "@/components/AdminLogin";
import AdminReviews from "@/components/AdminReviews";
import AdminVisitors from "@/components/AdminVisitors";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { visitorReport } from "@/lib/analytics";
import { cachedBookings } from "@/lib/bookings";
import { cachedReviews } from "@/lib/reviews";
import { secretStatus } from "@/lib/secrets";
import { getSettings, getSite, storageReady } from "@/lib/settings";
import "./admin.css";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const themeScript = `try{var t=localStorage.getItem("adm-theme");if(t)document.currentScript.parentElement.setAttribute("data-theme",t)}catch(e){}`;

export default async function AdminPage() {
  if (!adminConfigured()) {
    return (
      <main id="main-content" className="adm-page" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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
      <main id="main-content" className="adm-page" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AdminLogin />
      </main>
    );
  }
  const [pending, approved, bookings, settings, keys, site, report] = await Promise.all([
    cachedReviews.pending().catch(() => []),
    cachedReviews.approved().catch(() => []),
    cachedBookings().catch(() => []),
    getSettings(),
    secretStatus(),
    getSite(),
    visitorReport().catch(() => null),
  ]);
  return (
    <main id="main-content" className="adm-page" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <AdminApp
        initial={settings}
        bookings={<AdminBookings bookings={bookings} />}
        bookingList={<AdminBookingList bookings={bookings} />}
        visitors={<AdminVisitors report={report} />}
        keys={keys}
        webhookUrl={`${site.url}/api/stripe-webhook/`}
        canSave={storageReady()} pendingReviews={pending.length} reviews={<AdminReviews pending={pending} approved={approved} />} />
    </main>
  );
}

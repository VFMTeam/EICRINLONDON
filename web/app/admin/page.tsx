import type { Metadata } from "next";
import AdminLogin from "@/components/AdminLogin";
import AdminPanel from "@/components/AdminPanel";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { getSettings, storageReady } from "@/lib/settings";
import { logout } from "./actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const signedIn = await isAdmin();
  return (
    <main id="main-content" className="admin-page">
      <div className="admin-wrap">
        <header className="admin-head">
          <h1>Prices and offers</h1>
          {signedIn && (
            <form action={logout}>
              <button type="submit" className="admin-link">Log out</button>
            </form>
          )}
        </header>
        {!adminConfigured() ? (
          <p className="admin-note">Admin is switched off. Add ADMIN_PASSWORD (at least 8 characters) in Vercel, Settings, Environment Variables, then redeploy.</p>
        ) : !signedIn ? (
          <AdminLogin />
        ) : (
          <>
            {!storageReady() && <p className="admin-note">Saving is switched off until a Blob store is connected in Vercel, Storage.</p>}
            <AdminPanel initial={await getSettings()} canSave={storageReady()} />
          </>
        )}
      </div>
    </main>
  );
}

"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export default function AdminLogin() {
  const [error, action, pending] = useActionState(login, "");
  return (
    <form action={action} className="adm-login">
      <img src="/images/logo.png" alt="" width={56} height={48} />
      <h1>EICR in London <span>root@admin · secure access</span></h1>
      <label>
        <span>&gt; password</span>
        <input type="password" name="password" autoComplete="current-password" required autoFocus />
      </label>
      {error && <p className="bad" role="alert">{error}</p>}
      <button type="submit" disabled={pending}>{pending ? "Verifying…" : "Access"}</button>
    </form>
  );
}

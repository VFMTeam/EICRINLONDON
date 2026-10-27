"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export default function AdminLogin() {
  const [error, action, pending] = useActionState(login, "");
  return (
    <form action={action} className="adm-login">
      <img src="/images/logo.png" alt="" width={56} height={48} />
      <h1>EICR in London admin</h1>
      <label>
        <span>Password</span>
        <input type="password" name="password" autoComplete="current-password" required autoFocus />
      </label>
      {error && <p className="bad" role="alert">{error}</p>}
      <button type="submit" disabled={pending}>{pending ? "Checking…" : "Log in"}</button>
    </form>
  );
}

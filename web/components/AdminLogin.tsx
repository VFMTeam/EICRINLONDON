"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export default function AdminLogin() {
  const [error, action, pending] = useActionState(login, "");
  return (
    <form action={action} className="admin-card admin-login">
      <label>
        <span className="label">Password</span>
        <input className="field" type="password" name="password" autoComplete="current-password" required autoFocus />
      </label>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button type="submit" className="admin-save" disabled={pending}>{pending ? "Checking…" : "Log in"}</button>
    </form>
  );
}

"use server";

import { redirect } from "next/navigation";
import { isAdmin, logIn, logOut } from "@/lib/admin";
import { normaliseSettings, type Settings } from "@/lib/pricing";
import { saveSettings } from "@/lib/settings";

export async function login(_: string, form: FormData) {
  if (await logIn(String(form.get("password") ?? ""))) redirect("/admin/");
  await new Promise((r) => setTimeout(r, 1000));
  return "Wrong password.";
}

export async function logout() {
  await logOut();
  redirect("/admin/");
}

export async function save(settings: Settings): Promise<{ ok: boolean; message: string }> {
  if (!(await isAdmin())) return { ok: false, message: "Please log in again." };
  try {
    await saveSettings(normaliseSettings(settings));
    return { ok: true, message: "Saved. The website now shows these prices." };
  } catch (e) {
    console.error("Saving admin settings failed", e);
    return { ok: false, message: "Could not save. Check that the Blob store is connected in Vercel." };
  }
}

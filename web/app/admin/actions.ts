"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin, lockedOut, logIn, logOut } from "@/lib/admin";
import { normaliseSettings, type Settings } from "@/lib/pricing";
import { approveReview, deleteReview } from "@/lib/reviews";
import { saveSecrets, secretStatus, type SecretName, type SecretStatus } from "@/lib/secrets";
import { saveSettings } from "@/lib/settings";

export async function login(_: string, form: FormData) {
  if (await lockedOut()) return "Too many wrong passwords. Try again in 15 minutes.";
  if (await logIn(String(form.get("password") ?? ""))) redirect("/admin/");
  await new Promise((r) => setTimeout(r, 1000));
  return "Wrong password.";
}

export async function logout() {
  await logOut();
  redirect("/admin/");
}

export async function save(settings: Settings, keys: Partial<Record<SecretName, string>>): Promise<{ ok: boolean; message: string; keys?: SecretStatus }> {
  if (!(await isAdmin())) return { ok: false, message: "Please log in again." };
  try {
    await saveSettings(normaliseSettings(settings));
  } catch (e) {
    console.error("Saving admin settings failed", e);
    return { ok: false, message: "Could not save. Check that the Blob store is connected in Vercel." };
  }
  if (Object.values(keys).some((v) => v?.trim())) {
    try {
      await saveSecrets(keys);
    } catch (e) {
      console.error("Saving API keys failed", e);
      return { ok: false, message: "Settings saved, but the keys could not be saved. The Blob store must be private." };
    }
  }
  return { ok: true, message: "Saved. The website is updated.", keys: await secretStatus() };
}

export async function moderateReview(form: FormData) {
  if (!(await isAdmin())) redirect("/admin/");
  const id = String(form.get("id") ?? "");
  if (!/^[a-z0-9-]{1,40}$/.test(id)) return;
  const decision = form.get("decision");
  if (decision === "approve") await approveReview(id);
  if (decision === "reject") await deleteReview("pending", id);
  if (decision === "remove") await deleteReview("approved", id);
  revalidatePath("/admin/");
}

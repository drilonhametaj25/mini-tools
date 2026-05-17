"use client";
import { getSupabaseBrowser } from "./supabase-browser";

export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const supabase = getSupabaseBrowser();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Non autenticato");
  return fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

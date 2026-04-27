"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  expectedCookieValue,
  getAppPassword,
} from "@/lib/auth";

export async function login(formData: FormData): Promise<void> {
  const submitted = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (submitted !== getAppPassword()) {
    // Bounce back with an error flag so the page can show "wrong password".
    const url = new URL("/login", "http://placeholder");
    url.searchParams.set("err", "1");
    if (next && next !== "/") url.searchParams.set("next", next);
    redirect(url.pathname + "?" + url.searchParams.toString());
  }

  const value = await expectedCookieValue();
  const jar = await cookies();
  jar.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  redirect(next.startsWith("/") ? next : "/");
}

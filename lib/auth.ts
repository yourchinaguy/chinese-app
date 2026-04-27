// Tiny shared-password gate. The cookie value is a SHA-256 of the password
// (no salt — there's only one valid password anyway). Stateless so it
// works on Edge middleware. Sufficient for a personal app behind a public
// URL: the cookie is HttpOnly + Secure, can't be set by JS, and only
// matches if you knew the password.

export const COOKIE_NAME = "app-auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function getAppPassword(): string {
  // Local dev fallback so the app works without env setup. Production
  // sets APP_PASSWORD in Vercel.
  return process.env.APP_PASSWORD || "Chinese";
}

export async function hashPassword(pw: string): Promise<string> {
  const bytes = new TextEncoder().encode(pw);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedCookieValue(): Promise<string> {
  return hashPassword(getAppPassword());
}

export async function cookieIsValid(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const expected = await expectedCookieValue();
  return value === expected;
}

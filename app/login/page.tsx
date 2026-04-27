import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/";
  const showError = sp.err === "1";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">中文</h1>
      <p className="mt-1 text-sm text-zinc-500">Enter the password to continue.</p>
      <form action={login} className="mt-6 space-y-3">
        <input type="hidden" name="next" value={next} />
        <input
          type="password"
          name="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
        {showError && (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            Wrong password.
          </p>
        )}
        <button
          type="submit"
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}

import Link from "next/link";
import { RETEST_POOLS } from "@/lib/retest";
import { poolSizes } from "./actions";
import { RetestClient } from "./RetestClient";

export const dynamic = "force-dynamic";

export default async function RetestPage() {
  const sizes = await poolSizes();
  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← home
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Retest</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Pick a pool and run a quick 20-word check. Hits bump your confidence;
        misses get appended to a single &ldquo;Retest misses&rdquo; deck so you
        can study what&rsquo;s drifted.
      </p>

      <RetestClient pools={RETEST_POOLS} sizes={sizes} />
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { LibraryShell } from "@/components/library/LibraryShell";
import { fetchBodyById, getCategories, getCategoryCounts, getIndex } from "@/lib/library/dataClient";
import type { PromptIndexItem } from "@/lib/library/types";

export default function LibraryTestPage() {
  const [loaded, setLoaded] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [items, setItems] = useState<PromptIndexItem[]>([]);
  const [bodySample, setBodySample] = useState<string>("");

  useEffect(() => {
    async function run() {
      await getCategories();
      setCounts(await getCategoryCounts());
      const index = await getIndex();
      setItems(index);
      setLoaded(true);
    }
    run();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-2 text-xl font-semibold">Library Experience – Dev Harness</h1>
      <p className="mb-6 text-sm text-slate-600">
        This playground renders the compact library shell and exposes debug helpers for verifying the data pipeline and runtime hooks.
      </p>

      <section className="rounded-3xl border border-sky-100 bg-white/85 p-6 shadow-sm sm:p-7 md:p-8">
        <LibraryShell />
      </section>

      <details className="mt-8 rounded-2xl border border-slate-200 bg-white/80 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Debug data snapshot</summary>
        {!loaded ? (
          <p className="mt-3 text-sm text-slate-600">Loading debug data…</p>
        ) : (
          <div className="mt-3 space-y-4 text-sm">
            <section>
              <h2 className="text-base font-semibold">Category counts</h2>
              <pre className="rounded bg-slate-100 p-3 text-xs">{JSON.stringify(counts, null, 2)}</pre>
            </section>
            <section>
              <h2 className="text-base font-semibold">Index items ({items.length})</h2>
              <ul className="list-disc pl-6">
                {items.map((item) => (
                  <li key={item.id} className="py-0.5">
                    <span className="font-medium">{item.title}</span> — {item.shortDescription}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-base font-semibold">Fetch body (first item)</h2>
              <button
                type="button"
                className="rounded border px-3 py-1 text-sm"
                onClick={async () => {
                  const first = items[0];
                  if (!first) return;
                  const body = await fetchBodyById(first.id);
                  setBodySample(body?.body ?? "<no body>");
                }}
              >
                Load body
              </button>
              {bodySample && (
                <pre className="mt-2 max-h-60 overflow-auto rounded bg-slate-100 p-3 text-xs whitespace-pre-wrap">{bodySample}</pre>
              )}
            </section>
          </div>
        )}
      </details>

      <div className="pt-6">
        <Link href="/" className="text-emerald-700 underline">
          Back to home
        </Link>
      </div>
    </main>
  );
}


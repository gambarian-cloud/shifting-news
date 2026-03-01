"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { NewsItem } from "@/lib/news-data";
import SpectrumLoader from "./SpectrumLoader";

export interface RewrittenContent {
  headline: string;
  body: string;
  safety_notes: string;
}

type Level = -1 | 0 | 1;

/* ── Shared cache + inflight promise dedup ── */
const sharedCache = new Map<string, RewrittenContent>();
const inflightPromises = new Map<string, Promise<RewrittenContent>>();

async function fetchRewrite(
  id: string,
  level: number,
  signal?: AbortSignal
): Promise<RewrittenContent> {
  const key = `${id}_${level}`;

  // Return from cache
  if (sharedCache.has(key)) return sharedCache.get(key)!;

  // If already in flight — await the same promise (no duplicate request)
  if (inflightPromises.has(key)) return inflightPromises.get(key)!;

  // Start new request, store promise for dedup
  const promise = (async () => {
    const res = await fetch("/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, level }),
      signal,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error((errData as { error?: string }).error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      headline: string;
      body: string;
      safety_notes: string;
    };

    const content: RewrittenContent = {
      headline: data.headline,
      body: data.body,
      safety_notes: data.safety_notes,
    };

    sharedCache.set(key, content);
    return content;
  })();

  inflightPromises.set(key, promise);
  promise.finally(() => inflightPromises.delete(key));

  return promise;
}

/** Fire-and-forget background prefetch (no abort, silent fail) */
function prefetch(id: string, level: number) {
  const key = `${id}_${level}`;
  if (sharedCache.has(key) || inflightPromises.has(key)) return;
  fetchRewrite(id, level).catch(() => {});
}

/* ── Component ── */

interface NewsCardProps {
  article: NewsItem;
  nextArticleId?: string;
  isFirst?: boolean;
}

export default function NewsCard({ article, nextArticleId, isFirst }: NewsCardProps) {
  const [activeLevel, setActiveLevel] = useState<Level>(0);
  const [rewritten, setRewritten] = useState<RewrittenContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const handleLevelClick = useCallback(
    async (level: Level) => {
      if (level === activeLevel) return;

      abortRef.current?.abort();

      if (level === 0) {
        setActiveLevel(0);
        setRewritten(null);
        setLoading(false);
        setError(false);
        return;
      }

      const key = `${article.id}_${level}`;

      // Check shared cache — instant if prefetched
      if (sharedCache.has(key)) {
        setActiveLevel(level);
        setRewritten(sharedCache.get(key)!);
        setError(false);
        // Still prefetch opposite + next
        prefetch(article.id, level === -1 ? 1 : -1);
        if (nextArticleId) {
          prefetch(nextArticleId, -1);
          prefetch(nextArticleId, 1);
        }
        return;
      }

      setActiveLevel(level);
      setLoading(true);
      setError(false);
      setRewritten(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const content = await fetchRewrite(article.id, level, controller.signal);
        setRewritten(content);
        setLoading(false);

        // Prefetch opposite direction for this card
        prefetch(article.id, level === -1 ? 1 : -1);

        // Prefetch both directions for next card
        if (nextArticleId) {
          prefetch(nextArticleId, -1);
          prefetch(nextArticleId, 1);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setLoading(false);
          return;
        }
        setLoading(false);
        setError(true);
      }
    },
    [activeLevel, article.id, nextArticleId]
  );

  // Prefetch first card on mount
  useEffect(() => {
    if (isFirst) {
      prefetch(article.id, -1);
      prefetch(article.id, 1);
    }
    return () => {
      abortRef.current?.abort();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const headline = rewritten ? rewritten.headline : article.neutral_headline;
  const body = rewritten ? rewritten.body : article.neutral_facts;

  const isActive = activeLevel !== 0;

  const borderColor =
    activeLevel < 0
      ? "border-l-red-500"
      : activeLevel > 0
        ? "border-l-blue-500"
        : "border-l-transparent";

  const activeStyles = isActive
    ? "bg-gray-50 shadow-sm my-2 mx-1 rounded-lg"
    : "";

  return (
    <article
      className={`relative px-5 py-5 border-l-4 transition-all duration-300 ${borderColor} ${activeStyles}`}
    >
      {loading ? (
        <SpectrumLoader direction={activeLevel < 0 ? "left" : "right"} />
      ) : (
        <>
          <h2 className="text-lg font-bold text-gray-900 leading-tight mb-2">
            {headline}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">{body}</p>
          {error && (
            <p className="text-xs text-red-500 mb-2">
              Ошибка загрузки. Попробуйте ещё раз.
            </p>
          )}
        </>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={() => handleLevelClick(-1)}
          disabled={loading && activeLevel !== -1}
          aria-pressed={activeLevel === -1}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 disabled:opacity-40 ${
            activeLevel === -1
              ? "bg-red-600 text-white shadow-sm"
              : "text-gray-400 hover:text-red-600 hover:bg-red-50"
          }`}
        >
          ← лево
        </button>
        <button
          onClick={() => handleLevelClick(0)}
          disabled={loading && activeLevel !== 0}
          aria-pressed={activeLevel === 0}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 disabled:opacity-40 ${
            activeLevel === 0
              ? "bg-gray-800 text-white shadow-sm"
              : "text-gray-400 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          нейтрал
        </button>
        <button
          onClick={() => handleLevelClick(1)}
          disabled={loading && activeLevel !== 1}
          aria-pressed={activeLevel === 1}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 disabled:opacity-40 ${
            activeLevel === 1
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
          }`}
        >
          право →
        </button>
      </div>
    </article>
  );
}

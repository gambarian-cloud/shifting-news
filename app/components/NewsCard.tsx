"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { NewsItem } from "@/lib/news-data";
import SpectrumLoader from "./SpectrumLoader";

export interface RewrittenContent {
  headline: string;
  body: string;
  safety_notes: string;
}

type Level = -1 | 0 | 1;

const LEVELS: Level[] = [-1, 0, 1];

const LEVEL_LABELS: Record<string, string> = {
  "-1": "← лево",
  "0": "нейтрал",
  "1": "право →",
};

interface NewsCardProps {
  article: NewsItem;
}

export default function NewsCard({ article }: NewsCardProps) {
  const [activeLevel, setActiveLevel] = useState<Level>(0);
  const [rewritten, setRewritten] = useState<RewrittenContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const cacheRef = useRef<Map<string, RewrittenContent>>(new Map());
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

      if (cacheRef.current.has(key)) {
        setActiveLevel(level);
        setRewritten(cacheRef.current.get(key)!);
        setError(false);
        return;
      }

      setActiveLevel(level);
      setLoading(true);
      setError(false);
      setRewritten(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/rewrite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: article.id, level }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res
            .json()
            .catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(
            (errData as { error?: string }).error ?? `HTTP ${res.status}`
          );
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

        cacheRef.current.set(key, content);
        setRewritten(content);
        setLoading(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setLoading(false);
          return;
        }
        setLoading(false);
        setError(true);
      }
    },
    [activeLevel, article.id]
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const headline = rewritten ? rewritten.headline : article.neutral_headline;
  const body = rewritten ? rewritten.body : article.neutral_facts;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      {loading ? (
        /* Spectrum animation while loading */
        <SpectrumLoader direction={activeLevel < 0 ? "left" : "right"} />
      ) : (
        <>
          {/* Headline */}
          <h2 className="text-base font-semibold text-gray-900 leading-snug">
            {headline}
          </h2>

          {/* Body */}
          <p className="text-sm text-gray-600 leading-relaxed">{body}</p>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500">Ошибка загрузки. Попробуйте ещё раз.</p>
          )}
        </>
      )}

      {/* 3-button selector */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex gap-1">
          {LEVELS.map((level) => {
            const isActive = activeLevel === level;
            let btnClass = "text-gray-400 hover:text-gray-900 hover:bg-gray-50";
            if (isActive) {
              if (level < 0) btnClass = "bg-red-600 text-white";
              else if (level > 0) btnClass = "bg-blue-600 text-white";
              else btnClass = "bg-gray-900 text-white";
            }
            return (
              <button
                key={level}
                onClick={() => handleLevelClick(level)}
                disabled={loading && level !== activeLevel}
                aria-pressed={isActive}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${btnClass}`}
              >
                {LEVEL_LABELS[String(level)]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

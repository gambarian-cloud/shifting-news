"use client";

import { useState, useEffect } from "react";
import { newsData } from "@/lib/news-data";
import NewsCard from "./components/NewsCard";
import { prefetch } from "./components/NewsCard";
import SplashScreen from "./components/SplashScreen";

export default function HomePage() {
  const [splashVisible, setSplashVisible] = useState(true);

  // Aggressive prefetch: first 3 cards × 2 directions while splash is shown
  useEffect(() => {
    const ids = newsData.slice(0, 3).map((a) => a.id);
    ids.forEach((id) => {
      prefetch(id, -1);
      prefetch(id, 1);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f1f3]">
      {/* Feed always renders (so NewsCard useEffects fire), hidden under splash */}
      <div className={splashVisible ? "opacity-0 pointer-events-none" : "opacity-100 transition-opacity duration-300"}>
        {/* Top red accent bar */}
        <div className="h-1 bg-red-600" />

        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  SHIFTING<span className="text-red-600">NEWS</span>
                </h1>
                <p className="text-xs text-gray-400 mt-0.5 tracking-wide uppercase">
                  Один факт — два фрейма
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  лево
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  право
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* News feed */}
        <main className="max-w-3xl mx-auto px-4 py-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
            {newsData.map((article, index) => (
              <NewsCard
                key={article.id}
                article={article}
                nextArticleId={newsData[index + 1]?.id}
                isFirst={index === 0}
              />
            ))}
          </div>
        </main>

        {/* Footer */}
        <footer className="max-w-3xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-gray-400">
            Инструмент медиаграмотности · Факты одни — фрейм разный
          </p>
        </footer>
      </div>

      {/* Splash overlay */}
      {splashVisible && (
        <SplashScreen onDismiss={() => setSplashVisible(false)} />
      )}
    </div>
  );
}

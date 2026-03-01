import { newsData } from "@/lib/news-data";
import NewsCard from "./components/NewsCard";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Shifting News</h1>
          <p className="text-sm text-gray-500">
            Как одни факты звучат по-разному при смене редакционного фрейма
          </p>
        </header>

        <div className="space-y-3">
          {newsData.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>

        <footer className="mt-8 text-center text-xs text-gray-400">
          <p>Инструмент медиаграмотности. Факты одни — фрейм разный.</p>
        </footer>
      </div>
    </main>
  );
}

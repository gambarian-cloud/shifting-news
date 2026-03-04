"use client";

import { useState } from "react";

interface SplashScreenProps {
  onDismiss: () => void;
}

export default function SplashScreen({ onDismiss }: SplashScreenProps) {
  const [exiting, setExiting] = useState(false);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 400);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#f0f1f3] flex flex-col items-center justify-start text-center px-6 pt-16 md:pt-24 ${
        exiting ? "splash-exit" : ""
      }`}
    >
      <div className="splash-stagger flex flex-col items-center w-full" style={{maxWidth: "24rem"}}>
        {/* Logo */}
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          SHIFTING<span className="text-red-600">NEWS</span>
        </h1>

        {/* Tagline */}
        <p className="text-xs text-gray-400 mt-1 mb-4">
          Один факт — два фрейма
        </p>

        {/* Bernays portrait + quote group */}
        <div className="flex items-start gap-3 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Edward_Bernays_cropped.png/200px-Edward_Bernays_cropped.png"
            alt="Эдвард Бернейс"
            className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover grayscale opacity-80 shadow-md flex-shrink-0 mt-1"
          />
          <blockquote className="text-left">
            <p className="text-sm md:text-base text-gray-700 italic leading-snug">
              &laquo;Сознательное манипулирование мнениями масс — важный элемент демократии.&raquo;
            </p>
            <p className="text-xs text-gray-400 mt-1">
              — Эдвард Бернейс, 1928
            </p>
          </blockquote>
        </div>

        {/* Gradient divider red→blue */}
        <div className="w-16 h-0.5 rounded-full bg-gradient-to-r from-red-500 via-gray-300 to-blue-500 mb-4" />

        {/* Explanation */}
        <p className="text-xs text-gray-600 leading-relaxed mb-6">
          Одни и те же новости — два фрейма: левый и правый. Факты одни, подача разная.
        </p>

        {/* CTA */}
        <button
          onClick={handleDismiss}
          className="px-8 py-3 bg-red-600 text-white font-bold rounded-xl text-base shadow-lg hover:bg-red-700 transition-all active:scale-95 splash-cta-pulse w-full sm:w-auto"
        >
          Смотреть новости →
        </button>
      </div>
    </div>
  );
}

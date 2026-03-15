"use client";
// LanguageSelector.tsx
import { useEffect, useState } from "react";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
];

export default function LanguageSelector({ value, onChange }: { value: string; onChange: (lang: string) => void }) {
  useEffect(() => {
    // Detect browser language on mount
    const browserLang = navigator.language.slice(0, 2);
    if (!value && LANGUAGES.some(l => l.code === browserLang)) {
      if (typeof onChange === "function") {
        onChange(browserLang);
      }
    }
  }, [value, onChange]);

  return (
    <select
      className="border rounded px-3 py-2 w-full"
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label="Select language"
    >
      {LANGUAGES.map(l => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}

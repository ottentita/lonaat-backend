"use client";

import LanguageSelector from "@/components/LanguageSelector";
import { useState } from "react";

export default function ClientLanguageBar() {
  const [language, setLanguage] = useState("en");
  return (
    <div className="w-full flex justify-end px-4 py-2 bg-gray-50 border-b">
      <div className="w-40">
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>
    </div>
  );
}

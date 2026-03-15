"use client";
import DashboardLayout from "@/layouts/DashboardLayout";
import ProfileSettings from "@/components/Account/ProfileSettings";
import SecuritySettings from "@/components/Account/SecuritySettings";
import NotificationSettings from "@/components/Account/NotificationSettings";
import LanguageRegionSettings from "@/components/Account/LanguageRegionSettings";
import PaymentSettings from "@/components/Account/PaymentSettings";
import APIIntegrations from "@/components/Account/APIIntegrations";
import PrivacySettings from "@/components/Account/PrivacySettings";
import LanguageSelector from "@/components/LanguageSelector";
import { useState } from "react";

const sections = [
  { key: "profile", label: "Profile" },
  { key: "security", label: "Security" },
  { key: "notifications", label: "Notifications" },
  { key: "language", label: "Language & Region" },
  { key: "payment", label: "Payment" },
  { key: "api", label: "API & Integrations" },
  { key: "privacy", label: "Privacy" },
];

export default function AccountDashboard() {
  const [active, setActive] = useState("profile");
  // For i18n: language switcher with browser detection
  const [lang, setLang] = useState("");
  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-56 mb-4 md:mb-0">
          <div className="mb-6">
            <label className="block text-xs font-semibold mb-1">Language</label>
            <LanguageSelector value={lang} onChange={setLang} />
          </div>
          <nav className="flex flex-col gap-2">
            {sections.map(s => (
              <button
                key={s.key}
                className={`px-4 py-2 rounded text-left ${active === s.key ? "bg-blue-100 text-blue-700 font-semibold" : "text-gray-700 hover:bg-blue-50"}`}
                onClick={() => setActive(s.key)}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          {active === "profile" && <ProfileSettings />}
          {active === "security" && <SecuritySettings />}
          {active === "notifications" && <NotificationSettings />}
          {active === "language" && <LanguageRegionSettings />}
          {active === "payment" && <PaymentSettings />}
          {active === "api" && <APIIntegrations />}
          {active === "privacy" && <PrivacySettings />}
        </main>
      </div>
    </DashboardLayout>
  );
}

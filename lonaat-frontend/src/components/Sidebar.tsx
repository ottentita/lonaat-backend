"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Affiliate Marketplace", href: "/dashboard/affiliate" },
  { label: "Real Estate Marketplace", href: "/dashboard/real-estate" },
  { label: "Automobile Marketplace", href: "/dashboard/automobile" },
  { label: "AI Automation", href: "/dashboard/ai" },
  { label: "Payments", href: "/dashboard/payments" },
  { label: "Messages", href: "/dashboard/messages" },
  { label: "Account", href: "/dashboard/account" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="h-screen w-64 bg-white border-r flex flex-col py-8 px-4 shadow-sm">
      <div className="mb-8 text-2xl font-bold text-blue-700">Lonaat</div>
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 rounded text-base font-medium transition-colors ${
              pathname === item.href
                ? "bg-blue-100 text-blue-700"
                : "text-gray-700 hover:bg-blue-50"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

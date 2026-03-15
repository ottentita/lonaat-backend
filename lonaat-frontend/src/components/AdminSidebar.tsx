import Link from "next/link";

const adminNavItems = [
  { label: "Admin Dashboard", href: "/admin" },
  { label: "User Management", href: "/admin/users" },
  { label: "Listing Approvals", href: "/admin/listings" },
  { label: "Payment Monitoring", href: "/admin/payments" },
  { label: "Analytics Overview", href: "/admin/analytics" },
  { label: "Platform Config", href: "/admin/config" },
];

export default function AdminSidebar() {
  return (
    <aside className="h-screen w-64 bg-white border-r flex flex-col py-8 px-4 shadow-sm">
      <div className="mb-8 text-2xl font-bold text-red-700">Admin Panel</div>
      <nav className="flex-1 flex flex-col gap-2">
        {adminNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-4 py-2 rounded text-base font-medium text-gray-700 hover:bg-red-50 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

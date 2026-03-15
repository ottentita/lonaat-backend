import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:block">
        <AdminSidebar />
      </div>
      <main className="flex-1 p-2 sm:p-4 md:p-8 overflow-y-auto w-full">
        {/* Mobile nav toggle */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <div className="text-xl font-bold text-red-700">Admin Panel</div>
          {/* Could add a menu button here for a mobile drawer */}
        </div>
        {children}
      </main>
    </div>
  );
}

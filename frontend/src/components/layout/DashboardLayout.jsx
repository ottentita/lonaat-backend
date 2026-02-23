import React from "react";
import { Outlet, NavLink } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen flex">
      <aside className="fixed inset-y-0 left-0 w-[260px] bg-gradient-to-b from-blue-900 to-blue-700 text-white p-6">
        <div className="mb-10">
          <div className="text-2xl font-bold">Lonaat</div>
        </div>

        <nav className="space-y-3">
          <NavLink to="/dashboard" className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-md ${isActive ? 'bg-blue-500 text-white' : 'text-gray-200 hover:bg-white/5'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M13 5v6h6"/></svg>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-md ${isActive ? 'bg-blue-500 text-white' : 'text-gray-200 hover:bg-white/5'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7l9-4 9 4v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            <span>Products</span>
          </NavLink>
          <NavLink to="/real-estate" className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-md ${isActive ? 'bg-blue-500 text-white' : 'text-gray-200 hover:bg-white/5'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9l9-6 9 6v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            <span>Real Estate</span>
          </NavLink>
          <NavLink to="/automobiles" className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-md ${isActive ? 'bg-blue-500 text-white' : 'text-gray-200 hover:bg-white/5'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 13l2-3h14l2 3v6a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H4a1 1 0 0 1-1-1v-6z"/></svg>
            <span>Automobiles</span>
          </NavLink>
          <NavLink to="/services" className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-md ${isActive ? 'bg-blue-500 text-white' : 'text-gray-200 hover:bg-white/5'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z"/></svg>
            <span>Services</span>
          </NavLink>
          <NavLink to="/users" className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-md ${isActive ? 'bg-blue-500 text-white' : 'text-gray-200 hover:bg-white/5'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11c1.657 0 3-1.343 3-3S17.657 5 16 5s-3 1.343-3 3 1.343 3 3 3zM8 11c1.657 0 3-1.343 3-3S9.657 5 8 5 5 6.343 5 8s1.343 3 3 3zM4 19v-1a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1"/></svg>
            <span>Users</span>
          </NavLink>
          <NavLink to="/payments" className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-md ${isActive ? 'bg-blue-500 text-white' : 'text-gray-200 hover:bg-white/5'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.105 0-2 .672-2 1.5S10.895 11 12 11s2-.672 2-1.5S13.105 8 12 8zM12 3v2M12 19v2M5 12H3M21 12h-2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M17.66 6.34l1.41-1.41M6.34 17.66l-1.41 1.41"/></svg>
            <span>Payments</span>
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-md ${isActive ? 'bg-blue-500 text-white' : 'text-gray-200 hover:bg-white/5'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/></svg>
            <span>Reports</span>
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-md ${isActive ? 'bg-blue-500 text-white' : 'text-gray-200 hover:bg-white/5'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3v18h18"/></svg>
            <span>Analytics</span>
          </NavLink>
        </nav>
      </aside>

      <div className="ml-[260px] flex-1 flex flex-col">
        <header className="h-[70px] bg-white flex items-center justify-between px-6 shadow-sm border-b">
          <div className="flex items-center space-x-4">
            <div className="hidden md:block w-[420px]">
              <input type="search" placeholder="Search..." className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="px-3 py-1 bg-gray-100 rounded-full text-sm">Wallet: $0.00</div>
            <button className="p-2 rounded-full hover:bg-gray-100" aria-label="notifications">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            </button>
            <div className="w-9 h-9 rounded-full bg-gray-200" aria-hidden />
          </div>
        </header>

        <main className="bg-gray-100 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
    fontFamily: "Arial, sans-serif",
    background: "#0f172a",
    minHeight: "100vh",
    color: "white",
  },
  title: {
    textAlign: "center",
    marginBottom: "20px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
  },
  card: {
    background: "#1e293b",
    padding: "15px",
    borderRadius: "10px",
    textAlign: "center",
  },
  image: {
    width: "100%",
    height: "160px",
    objectFit: "cover",
    borderRadius: "8px",
    marginBottom: "10px",
  },
  button: {
    marginTop: "10px",
    padding: "10px 15px",
    background: "#3b82f6",
    border: "none",
    borderRadius: "6px",
    color: "white",
    cursor: "pointer",
  },
};

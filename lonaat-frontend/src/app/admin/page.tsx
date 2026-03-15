"use client";
import AdminLayout from "@/layouts/AdminLayout";
import AdminPanelCard from "@/components/AdminPanelCard";
import AdminTable from "@/components/AdminTable";
import AdminSectionTabs from "@/components/AdminSectionTabs";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { useState } from "react";

const sections = [
  { key: "users", label: "Users" },
  { key: "listings", label: "Listings" },
  { key: "payments", label: "Payments" },
  { key: "ai", label: "AI Automations" },
  { key: "analytics", label: "Analytics" },
  { key: "config", label: "Config" },
];

const mockUsers = [
  { Name: "Jane Doe", Email: "jane@example.com", Role: "User", Status: "Active" },
  { Name: "John Admin", Email: "admin@lonaat.com", Role: "Admin", Status: "Active" },
];
const mockListings = [
  { Title: "3BR Apartment", Type: "Real Estate", Status: "Pending" },
  { Title: "Toyota Corolla", Type: "Automobile", Status: "Approved" },
];
const mockPayments = [
  { Date: "2026-03-01", Amount: "$49.00", User: "Jane Doe", Status: "Paid" },
  { Date: "2026-02-01", Amount: "$99.00", User: "John Admin", Status: "Paid" },
];
const mockAI = [
  { Name: "Campaign Generator", Status: "Active", Runs: "12" },
  { Name: "Traffic Optimizer", Status: "Inactive", Runs: "5" },
];
const mockAnalytics = [
  { Metric: "Active Users", Value: "1,234" },
  { Metric: "Listings", Value: "87" },
  { Metric: "Revenue", Value: "$12,340" },
];

export default function AdminDashboard() {
  const [active, setActive] = useState("users");
  // Mock loading/error state
  const [loading, setLoading] = useState(false); // set true to simulate loading
  const [error, setError] = useState(""); // set to a string to simulate error

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      {loading ? (
        <LoadingState message="Loading admin data..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <AdminPanelCard title="Users" value={mockUsers.length} description="Total users" />
            <AdminPanelCard title="Listings" value={mockListings.length} description="Total listings" />
            <AdminPanelCard title="Payments" value={mockPayments.length} description="Total payments" />
            <AdminPanelCard title="AI Automations" value={mockAI.length} description="Active automations" />
          </div>
          <AdminSectionTabs sections={sections} active={active} onSelect={setActive} />
          {active === "users" && (
            mockUsers.length === 0 ? <EmptyState message="No users found." /> : <AdminTable columns={["Name", "Email", "Role", "Status"]} data={mockUsers} />
          )}
          {active === "listings" && (
            mockListings.length === 0 ? <EmptyState message="No listings found." /> : <AdminTable columns={["Title", "Type", "Status"]} data={mockListings} />
          )}
          {active === "payments" && (
            mockPayments.length === 0 ? <EmptyState message="No payments found." /> : <AdminTable columns={["Date", "Amount", "User", "Status"]} data={mockPayments} />
          )}
          {active === "ai" && (
            mockAI.length === 0 ? <EmptyState message="No AI automations found." /> : <AdminTable columns={["Name", "Status", "Runs"]} data={mockAI} />
          )}
          {active === "analytics" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {mockAnalytics.length === 0 ? <EmptyState message="No analytics data." /> : mockAnalytics.map(a => (
                <AdminPanelCard key={a.Metric} title={a.Metric} value={a.Value} description="" />
              ))}
            </div>
          )}
          {active === "config" && (
            <div className="bg-white shadow rounded p-6">Platform configuration and settings go here.</div>
          )}
        </>
      )}
    </AdminLayout>
  );
}

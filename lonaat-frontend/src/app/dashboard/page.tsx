"use client";
import DashboardLayout from "@/layouts/DashboardLayout";
import AnalyticsCard from "@/components/AnalyticsCard";
import ChartMock from "@/components/ChartMock";
import RecentActivity from "@/components/RecentActivity";
import QuickActions from "@/components/QuickActions";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { useEffect, useState } from "react";
import { userService } from "@/services/userService";
import { paymentService } from "@/services/paymentService";
import { messageService } from "@/services/messageService";

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      userService.getUsers(),
      paymentService.getCharges(),
      messageService.getConversations(),
    ])
      .then(([usersRes, paymentsRes, messagesRes]) => {
        // Example analytics, adapt as needed for your backend
        setAnalytics([
          { title: "Active Users", value: usersRes.data.length, trend: "", trendType: "up" },
          { title: "Payments", value: paymentsRes.data.length, trend: "", trendType: "up" },
          { title: "Messages", value: messagesRes.data.length, trend: "", trendType: "up" },
        ]);
        // Example activity, adapt as needed for your backend
        setActivity([
          ...paymentsRes.data.map((p: any) => ({ id: p.id || p._id, type: "payment", description: `Payment: ${p.amount}`, time: p.date || "-" })),
          ...messagesRes.data.map((m: any) => ({ id: m.id || m._id, type: "message", description: `Message: ${m.subject || m.preview || "New message"}`, time: m.time || "-" })),
        ]);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load dashboard data.");
        setLoading(false);
      });
  }, []);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>
      {loading ? (
        <LoadingState message="Loading dashboard..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {analytics.length === 0 ? (
              <EmptyState message="No analytics data." />
            ) : (
              analytics.map((a) => (
                <AnalyticsCard key={a.title} {...a} />
              ))
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="col-span-2">
              <ChartMock />
            </div>
            <RecentActivity items={activity} />
          </div>
          <QuickActions />
        </>
      )}
    </DashboardLayout>
  );
}

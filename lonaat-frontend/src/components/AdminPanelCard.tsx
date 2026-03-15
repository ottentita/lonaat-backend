"use client";
import React from "react";
interface AdminPanelCardProps {
  title: string;
  value: string | number;
  description: string;
  icon?: React.ReactNode;
}
export default function AdminPanelCard({ title, value, description, icon }: AdminPanelCardProps) {
  return (
    <div className="bg-white shadow rounded p-4 sm:p-6 flex flex-col gap-2 min-w-[140px] sm:min-w-[180px] w-full">
      <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">{icon}{title}</div>
      <div className="text-xl sm:text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  );
}

// AnalyticsCard.tsx
interface AnalyticsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  trendType?: "up" | "down";
}

export default function AnalyticsCard({ title, value, icon, trend, trendType }: AnalyticsCardProps) {
  return (
    <div className="bg-white shadow rounded p-6 flex flex-col gap-2 min-w-[180px]">
      <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
        {icon}
        {title}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {trend && (
        <div className={`text-xs ${trendType === "up" ? "text-green-600" : "text-red-600"}`}>{trendType === "up" ? "▲" : "▼"} {trend}</div>
      )}
    </div>
  );
}

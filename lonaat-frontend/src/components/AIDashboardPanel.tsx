// AIDashboardPanel.tsx
interface AIDashboardPanelProps {
  title: string;
  value: string;
  description: string;
}

export default function AIDashboardPanel({ title, value, description }: AIDashboardPanelProps) {
  return (
    <div className="bg-white shadow rounded p-4 flex flex-col gap-1">
      <div className="font-semibold text-base">{title}</div>
      <div className="text-2xl font-bold text-blue-700">{value}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  );
}

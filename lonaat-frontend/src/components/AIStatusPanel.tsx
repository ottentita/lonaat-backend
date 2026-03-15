// AIStatusPanel.tsx
interface AIStatusPanelProps {
  title: string;
  status: string;
  details: string;
}

export default function AIStatusPanel({ title, status, details }: AIStatusPanelProps) {
  return (
    <div className="bg-white shadow rounded p-4 flex flex-col gap-1">
      <div className="font-semibold text-base">{title}</div>
      <div className={`text-xs font-medium ${status === 'Online' ? 'text-green-600' : 'text-red-600'}`}>Status: {status}</div>
      <div className="text-xs text-gray-500">{details}</div>
    </div>
  );
}

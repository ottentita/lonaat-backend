// SubscriptionPanel.tsx
interface SubscriptionPanelProps {
  plan: string;
  status: string;
  renewal: string;
}

export default function SubscriptionPanel({ plan, status, renewal }: SubscriptionPanelProps) {
  return (
    <div className="bg-white shadow rounded p-4 flex flex-col gap-1">
      <div className="font-semibold text-base">Plan: {plan}</div>
      <div className={`text-xs font-medium ${status === 'Active' ? 'text-green-600' : 'text-red-600'}`}>Status: {status}</div>
      <div className="text-xs text-gray-500">Renews: {renewal}</div>
    </div>
  );
}

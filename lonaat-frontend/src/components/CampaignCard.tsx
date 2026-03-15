// CampaignCard.tsx
interface CampaignCardProps {
  name: string;
  status: string;
  clicks: number;
  conversions: number;
  revenue: string;
}

export default function CampaignCard({ name, status, clicks, conversions, revenue }: CampaignCardProps) {
  return (
    <div className="bg-white shadow rounded p-4 flex flex-col gap-1">
      <div className="font-semibold text-base">{name}</div>
      <div className="text-xs text-gray-500 mb-1">Status: <span className={status === 'Active' ? 'text-green-600' : 'text-gray-400'}>{status}</span></div>
      <div className="flex gap-4 text-xs">
        <span>Clicks: <b>{clicks}</b></span>
        <span>Conversions: <b>{conversions}</b></span>
        <span>Revenue: <b>{revenue}</b></span>
      </div>
    </div>
  );
}

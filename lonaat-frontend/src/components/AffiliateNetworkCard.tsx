// AffiliateNetworkCard.tsx
interface AffiliateNetworkCardProps {
  name: string;
  description: string;
  logoUrl?: string;
  stats: string;
}

export default function AffiliateNetworkCard({ name, description, logoUrl, stats }: AffiliateNetworkCardProps) {
  return (
    <div className="bg-white shadow rounded p-4 flex gap-4 items-center">
      {logoUrl && <img src={logoUrl} alt={name} className="w-12 h-12 rounded" />}
      <div className="flex-1">
        <div className="font-semibold text-lg">{name}</div>
        <div className="text-gray-600 text-sm mb-1">{description}</div>
        <div className="text-xs text-blue-700 font-medium">{stats}</div>
      </div>
    </div>
  );
}

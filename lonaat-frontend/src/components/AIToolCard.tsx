// AIToolCard.tsx
interface AIToolCardProps {
  name: string;
  description: string;
  status: string;
  onConfigure?: () => void;
}

export default function AIToolCard({ name, description, status, onConfigure }: AIToolCardProps) {
  return (
    <div className="bg-white shadow rounded p-4 flex flex-col gap-2">
      <div className="font-semibold text-base">{name}</div>
      <div className="text-gray-600 text-sm mb-1">{description}</div>
      <div className={`text-xs font-medium ${status === 'Active' ? 'text-green-600' : 'text-gray-400'}`}>Status: {status}</div>
      <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm self-end mt-2" onClick={onConfigure}>Configure</button>
    </div>
  );
}

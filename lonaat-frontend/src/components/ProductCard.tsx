// ProductCard.tsx
interface ProductCardProps {
  name: string;
  imageUrl?: string;
  price: string;
  network: string;
  onPromote?: () => void;
}

export default function ProductCard({ name, imageUrl, price, network, onPromote }: ProductCardProps) {
  return (
    <div className="bg-white shadow rounded p-4 flex flex-col items-center">
      {imageUrl && <img src={imageUrl} alt={name} className="w-20 h-20 object-cover rounded mb-2" />}
      <div className="font-semibold text-base mb-1">{name}</div>
      <div className="text-xs text-gray-500 mb-1">{network}</div>
      <div className="text-blue-700 font-bold mb-2">{price}</div>
      <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm" onClick={onPromote}>Promote</button>
    </div>
  );
}

// VehicleCard.tsx
interface VehicleCardProps {
  brand: string;
  model: string;
  imageUrl?: string;
  price: string;
  year: string;
  location: string;
  onView?: () => void;
}

export default function VehicleCard({ brand, model, imageUrl, price, year, location, onView }: VehicleCardProps) {
  return (
    <div className="bg-white shadow rounded p-4 flex flex-col">
      {imageUrl && <img src={imageUrl} alt={model} className="w-full h-32 object-cover rounded mb-2" />}
      <div className="font-semibold text-base mb-1">{brand} {model}</div>
      <div className="text-xs text-gray-500 mb-1">{year} • {location}</div>
      <div className="text-blue-700 font-bold mb-2">{price}</div>
      <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm self-end" onClick={onView}>View Details</button>
    </div>
  );
}

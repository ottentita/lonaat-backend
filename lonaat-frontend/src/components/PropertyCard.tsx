// PropertyCard.tsx
interface PropertyCardProps {
  title: string;
  imageUrl?: string;
  price: string;
  location: string;
  category: string;
  onView?: () => void;
}

export default function PropertyCard({ title, imageUrl, price, location, category, onView }: PropertyCardProps) {
  return (
    <div className="bg-white shadow rounded p-4 flex flex-col">
      {imageUrl && <img src={imageUrl} alt={title} className="w-full h-32 object-cover rounded mb-2" />}
      <div className="font-semibold text-base mb-1">{title}</div>
      <div className="text-xs text-gray-500 mb-1">{category} • {location}</div>
      <div className="text-blue-700 font-bold mb-2">{price}</div>
      <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm self-end" onClick={onView}>View Details</button>
    </div>
  );
}

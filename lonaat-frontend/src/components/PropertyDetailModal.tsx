// PropertyDetailModal.tsx
interface PropertyDetailModalProps {
  open: boolean;
  onClose: () => void;
  property: {
    title: string;
    imageUrl?: string;
    price: string;
    location: string;
    category: string;
    description: string;
    seller: string;
    contact: string;
  };
}

export default function PropertyDetailModal({ open, onClose, property }: PropertyDetailModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-8 w-full max-w-lg relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>✕</button>
        {property.imageUrl && <img src={property.imageUrl} alt={property.title} className="w-full h-48 object-cover rounded mb-4" />}
        <h2 className="text-2xl font-bold mb-2">{property.title}</h2>
        <div className="text-blue-700 font-bold mb-2">{property.price}</div>
        <div className="text-sm text-gray-500 mb-2">{property.category} • {property.location}</div>
        <div className="mb-4 text-gray-700">{property.description}</div>
        <div className="text-sm text-gray-600 mb-2">Seller: {property.seller}</div>
        <a href={`mailto:${property.contact}`} className="px-4 py-2 bg-blue-600 text-white rounded">Contact Seller</a>
      </div>
    </div>
  );
}

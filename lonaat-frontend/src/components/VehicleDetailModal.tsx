// VehicleDetailModal.tsx
interface VehicleDetailModalProps {
  open: boolean;
  onClose: () => void;
  vehicle: {
    brand: string;
    model: string;
    imageUrl?: string;
    price: string;
    year: string;
    location: string;
    description: string;
    seller: string;
    contact: string;
  };
}

export default function VehicleDetailModal({ open, onClose, vehicle }: VehicleDetailModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-8 w-full max-w-lg relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>✕</button>
        {vehicle.imageUrl && <img src={vehicle.imageUrl} alt={vehicle.model} className="w-full h-48 object-cover rounded mb-4" />}
        <h2 className="text-2xl font-bold mb-2">{vehicle.brand} {vehicle.model}</h2>
        <div className="text-blue-700 font-bold mb-2">{vehicle.price}</div>
        <div className="text-sm text-gray-500 mb-2">{vehicle.year} • {vehicle.location}</div>
        <div className="mb-4 text-gray-700">{vehicle.description}</div>
        <div className="text-sm text-gray-600 mb-2">Seller: {vehicle.seller}</div>
        <a href={`mailto:${vehicle.contact}`} className="px-4 py-2 bg-blue-600 text-white rounded">Contact Seller</a>
      </div>
    </div>
  );
}

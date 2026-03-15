// VehicleFilterBar.tsx
interface VehicleFilterBarProps {
  brands: string[];
  selected: string;
  onSelect: (brand: string) => void;
}

export default function VehicleFilterBar({ brands, selected, onSelect }: VehicleFilterBarProps) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {brands.map((b) => (
        <button
          key={b}
          className={`px-3 py-1 rounded border text-sm ${selected === b ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border-blue-200'}`}
          onClick={() => onSelect(b)}
        >
          {b}
        </button>
      ))}
    </div>
  );
}

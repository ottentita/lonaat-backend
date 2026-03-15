// FilterBar.tsx
interface FilterBarProps {
  filters: string[];
  selected: string;
  onSelect: (filter: string) => void;
}

export default function FilterBar({ filters, selected, onSelect }: FilterBarProps) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {filters.map((f) => (
        <button
          key={f}
          className={`px-3 py-1 rounded border text-sm ${selected === f ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border-blue-200'}`}
          onClick={() => onSelect(f)}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

// PropertyFilterBar.tsx
interface PropertyFilterBarProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export default function PropertyFilterBar({ categories, selected, onSelect }: PropertyFilterBarProps) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {categories.map((c) => (
        <button
          key={c}
          className={`px-3 py-1 rounded border text-sm ${selected === c ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border-blue-200'}`}
          onClick={() => onSelect(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

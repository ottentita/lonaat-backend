// VehicleSearchSortBar.tsx
interface VehicleSearchSortBarProps {
  search: string;
  onSearch: (v: string) => void;
  sort: string;
  onSort: (v: string) => void;
  sortOptions: string[];
}

export default function VehicleSearchSortBar({ search, onSearch, sort, onSort, sortOptions }: VehicleSearchSortBarProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-4 items-center">
      <input
        type="text"
        placeholder="Search vehicles..."
        value={search}
        onChange={e => onSearch(e.target.value)}
        className="border rounded px-3 py-1 text-sm"
      />
      <select
        value={sort}
        onChange={e => onSort(e.target.value)}
        className="border rounded px-3 py-1 text-sm"
      >
        {sortOptions.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

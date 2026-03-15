// AdminSectionTabs.tsx
interface AdminSectionTabsProps {
  sections: { key: string; label: string }[];
  active: string;
  onSelect: (key: string) => void;
}

export default function AdminSectionTabs({ sections, active, onSelect }: AdminSectionTabsProps) {
  return (
    <nav className="flex gap-1 sm:gap-2 mb-6 flex-wrap scrollbar-hide">
      {sections.map(s => (
        <button
          key={s.key}
          className={`px-3 sm:px-4 py-2 rounded touch-manipulation ${active === s.key ? "bg-red-100 text-red-700 font-semibold" : "text-gray-700 hover:bg-red-50"}`}
          onClick={() => onSelect(s.key)}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}

// AdminTable.tsx
interface AdminTableProps {
  columns: string[];
  data: Array<Record<string, string>>;
}

export default function AdminTable({ columns, data }: AdminTableProps) {
  return (
    <div className="overflow-x-auto bg-white shadow rounded mb-6">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col} className="px-2 sm:px-4 py-2 text-left font-semibold bg-gray-50 whitespace-nowrap">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t hover:bg-gray-50 transition-colors">
              {columns.map(col => (
                <td key={col} className="px-2 sm:px-4 py-2 whitespace-nowrap">{row[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

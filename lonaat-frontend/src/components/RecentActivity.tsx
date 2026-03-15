// RecentActivity.tsx
interface ActivityItem {
  id: string;
  type: string;
  description: string;
  time: string;
}

export default function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <div className="bg-white shadow rounded p-6">
      <h2 className="font-semibold text-lg mb-4">Recent Activity</h2>
      <ul className="divide-y divide-gray-100">
        {items.map((item) => (
          <li key={item.id} className="py-2 flex flex-col">
            <span className="text-sm text-gray-700">{item.description}</span>
            <span className="text-xs text-gray-400">{item.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

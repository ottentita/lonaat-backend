// QuickActions.tsx
export default function QuickActions() {
  return (
    <div className="bg-white shadow rounded p-6 flex gap-4 flex-wrap">
      <button className="px-4 py-2 bg-blue-600 text-white rounded">Create Listing</button>
      <button className="px-4 py-2 bg-green-600 text-white rounded">Add Payment</button>
      <button className="px-4 py-2 bg-gray-200 text-blue-700 rounded">Send Message</button>
      <button className="px-4 py-2 bg-yellow-500 text-white rounded">Upgrade Plan</button>
    </div>
  );
}

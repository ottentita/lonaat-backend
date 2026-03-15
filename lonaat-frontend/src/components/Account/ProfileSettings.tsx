// ProfileSettings.tsx
export default function ProfileSettings() {
  return (
    <section className="bg-white shadow rounded p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
      <div className="flex gap-6 items-center mb-4">
        <img src="https://placehold.co/80x80" alt="Profile" className="w-20 h-20 rounded-full" />
        <div>
          <button className="px-3 py-1 bg-gray-200 text-blue-700 rounded">Change Image</button>
        </div>
      </div>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input className="border rounded px-3 py-2" placeholder="Name" defaultValue="Jane Doe" />
        <input className="border rounded px-3 py-2" placeholder="Email" defaultValue="jane@example.com" />
        <input className="border rounded px-3 py-2" placeholder="Phone" defaultValue="+234 800 000 0000" />
        <input className="border rounded px-3 py-2" placeholder="Country" defaultValue="Nigeria" />
        <input className="border rounded px-3 py-2" placeholder="Company" defaultValue="Lonaat Ltd" />
      </form>
      <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
    </section>
  );
}

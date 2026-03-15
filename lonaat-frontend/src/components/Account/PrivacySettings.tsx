// PrivacySettings.tsx
export default function PrivacySettings() {
  return (
    <section className="bg-white shadow rounded p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Privacy Settings</h2>
      <form className="flex flex-col gap-3 mb-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked /> Profile Visible
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" /> Allow Data Export
        </label>
      </form>
      <button className="px-4 py-2 bg-gray-200 text-red-700 rounded mb-2">Request Data Export</button>
      <button className="px-4 py-2 bg-red-600 text-white rounded">Delete Account</button>
    </section>
  );
}

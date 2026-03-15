// LanguageRegionSettings.tsx
export default function LanguageRegionSettings() {
  return (
    <section className="bg-white shadow rounded p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Language & Region Settings</h2>
      <form className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <select className="border rounded px-3 py-2" defaultValue="en">
          <option value="en">English</option>
          <option value="fr">French</option>
          <option value="es">Spanish</option>
        </select>
        <select className="border rounded px-3 py-2" defaultValue="Africa/Lagos">
          <option value="Africa/Lagos">Lagos (GMT+1)</option>
          <option value="Europe/London">London (GMT+0)</option>
        </select>
        <select className="border rounded px-3 py-2" defaultValue="USD">
          <option value="USD">USD</option>
          <option value="NGN">NGN</option>
          <option value="EUR">EUR</option>
        </select>
      </form>
      <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
    </section>
  );
}

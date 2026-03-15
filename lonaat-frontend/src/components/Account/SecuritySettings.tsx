// SecuritySettings.tsx
export default function SecuritySettings() {
  return (
    <section className="bg-white shadow rounded p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Security Settings</h2>
      <form className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <input className="border rounded px-3 py-2" type="password" placeholder="Current Password" />
        <input className="border rounded px-3 py-2" type="password" placeholder="New Password" />
        <input className="border rounded px-3 py-2" type="password" placeholder="Confirm New Password" />
      </form>
      <button className="px-4 py-2 bg-blue-600 text-white rounded mb-4">Change Password</button>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Two-Factor Authentication</h3>
        <button className="px-3 py-1 bg-gray-200 text-blue-700 rounded mr-2">Enable 2FA</button>
        <button className="px-3 py-1 bg-gray-200 text-blue-700 rounded">Manage Devices</button>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Login Activity</h3>
        <ul className="text-sm text-gray-600">
          <li>2026-03-12 10:00 - Lagos, Nigeria - Chrome</li>
          <li>2026-03-11 18:22 - Abuja, Nigeria - Mobile</li>
        </ul>
      </div>
    </section>
  );
}

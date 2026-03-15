// NotificationSettings.tsx
export default function NotificationSettings() {
  return (
    <section className="bg-white shadow rounded p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
      <form className="flex flex-col gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked /> Email Alerts
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked /> Campaign Alerts
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" /> Security Alerts
        </label>
      </form>
      <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Save Preferences</button>
    </section>
  );
}

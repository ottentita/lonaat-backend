// PaymentSettings.tsx
export default function PaymentSettings() {
  return (
    <section className="bg-white shadow rounded p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Payment Settings</h2>
      <div className="mb-2">Subscription: <span className="font-medium text-green-600">Active</span></div>
      <div className="mb-2">Plan: <span className="font-medium">Pro</span></div>
      <div className="mb-2">Next Billing: <span className="font-medium">2026-04-01</span></div>
      <h3 className="font-semibold mt-4 mb-2">Coinbase Billing History</h3>
      <ul className="text-sm text-gray-600">
        <li>2026-03-01 - $49.00 - Paid</li>
        <li>2026-02-01 - $49.00 - Paid</li>
      </ul>
    </section>
  );
}

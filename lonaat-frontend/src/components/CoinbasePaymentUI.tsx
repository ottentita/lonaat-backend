// CoinbasePaymentUI.tsx
export default function CoinbasePaymentUI() {
  return (
    <div className="bg-white shadow rounded p-6 flex flex-col items-center">
      <h2 className="font-semibold text-lg mb-2">Pay with Coinbase Commerce</h2>
      <button className="px-6 py-2 bg-blue-600 text-white rounded mb-2">Start Payment</button>
      <p className="text-xs text-gray-500">Secure crypto payments powered by Coinbase Commerce.</p>
    </div>
  );
}

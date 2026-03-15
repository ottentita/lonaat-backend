// APIIntegrations.tsx
import React, { useState } from 'react';

const INTEGRATIONS = [
  {
    group: "Affiliate Networks",
    items: [
      { name: "Digistore24" },
      { name: "ClickBank" },
      { name: "JVZoo" },
      { name: "Impact" },
      { name: "WarriorPlus" },
      { name: "Amazon" },
    ],
  },
  {
    group: "Advertising Platforms",
    items: [
      { name: "Google Ads" },
      { name: "Facebook Ads" },
      { name: "TikTok Ads" },
    ],
  },
  {
    group: "AI Tools",
    items: [
      { name: "OpenAI API" },
    ],
  },
  {
    group: "Payment Providers",
    items: [
      { name: "Coinbase Commerce" },
      { name: "Stripe", placeholder: true },
      { name: "Flutterwave", placeholder: true },
    ],
  },
];

function IntegrationPanel({ name, placeholder }: { name: string; placeholder?: boolean }) {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTest = () => {
    setTesting(true);
    setTimeout(() => {
      setTestResult(apiKey ? "Connection successful!" : "API key required.");
      setStatus(apiKey ? "Connected" : "Disconnected");
      setTesting(false);
    }, 1000);
  };

  return (
    <div className="bg-white shadow rounded p-4 flex flex-col gap-2 mb-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-base">{name}</div>
        <span className={`text-xs font-medium ${status === "Connected" ? "text-green-600" : "text-gray-400"}`}>{status}</span>
      </div>
      {placeholder ? (
        <div className="text-xs text-gray-400 italic">Coming soon</div>
      ) : (
        <>
          <input
            className="border rounded px-3 py-2 text-sm"
            placeholder="Enter API Key"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            disabled={testing}
          />
          <div className="flex gap-2">
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            {testResult && <span className={`text-xs ${testResult.includes("success") ? "text-green-600" : "text-red-600"}`}>{testResult}</span>}
          </div>
        </>
      )}
    </div>
  );
}

export default function APIIntegrations() {
  return (
    <section className="bg-white shadow rounded p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Integrations</h2>
      {INTEGRATIONS.map(group => (
        <div key={group.group} className="mb-6">
          <h3 className="font-semibold mb-2 text-blue-700">{group.group}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.items.map(item => (
              <IntegrationPanel key={item.name} name={item.name} placeholder={item.placeholder} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

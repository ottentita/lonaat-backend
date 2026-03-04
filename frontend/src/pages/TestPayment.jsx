import { useState } from 'react'
import { api } from '../services/api';

export default function TestPayment() {
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)

  async function createPayment() {
    try {
      setLoading(true)
      setResponse(null)
      const resp = await api.post('/payments/create', { amount: '1.00' });
      setResponse({ status: resp.status, ok: resp.status >= 200 && resp.status < 300, data: resp.data });
    } catch (err) {
      console.error('Create payment error:', err)
      setResponse({ error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Test Payment</h1>
      <p className="mb-4">Click the button to POST to <code>/api/payments/create</code>.</p>
      <button
        onClick={createPayment}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Create Payment'}
      </button>

      <div className="mt-6">
        <h2 className="text-lg font-medium">Response</h2>
        <pre className="mt-2 whitespace-pre-wrap bg-slate-100 p-3 rounded">
          {response ? JSON.stringify(response, null, 2) : 'No response yet'}
        </pre>

        {response?.data?.hosted_url && (
          <p className="mt-3">
            Hosted URL: <a className="text-blue-600 underline" href={response.data.hosted_url} target="_blank" rel="noreferrer">{response.data.hosted_url}</a>
          </p>
        )}
      </div>
    </div>
  )
}

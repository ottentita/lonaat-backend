import React, { useEffect, useState } from "react";
import { api } from '../services/api'
import { Loader2 } from 'lucide-react'

export default function DashboardHome() {
  return (
    <div className="space-y-8">
      {/* SECTION 1: Category cards */}
      <StatsSection />

      {/* SECTION 2: Performance + Latest Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6 h-64">
          <h4 className="font-semibold mb-3">Platform Performance</h4>
          <div className="h-44 bg-gray-50 rounded-md flex items-center justify-center">Chart placeholder</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 h-64">
          <h4 className="font-semibold mb-3">Latest Payments</h4>
          <ul className="space-y-3 overflow-auto" style={{ maxHeight: '44px' }}>
            <li className="text-sm text-gray-700">Payment #123 — $120 — Completed</li>
            <li className="text-sm text-gray-700">Payment #122 — $80 — Pending</li>
            <li className="text-sm text-gray-700">Payment #121 — $40 — Completed</li>
          </ul>
        </div>
      </div>

      {/* SECTION 3: Insights + Quick Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
          <h4 className="font-semibold mb-3">Platform Insights</h4>
          <div className="overflow-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="text-gray-500">
                  <th className="pb-2">Metric</th>
                  <th className="pb-2">Value</th>
                  <th className="pb-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2">Active Users</td>
                  <td className="py-2">3,412</td>
                  <td className="py-2">+4.2%</td>
                </tr>
                <tr>
                  <td className="py-2">New Signups</td>
                  <td className="py-2">412</td>
                  <td className="py-2">+1.1%</td>
                </tr>
                <tr>
                  <td className="py-2">Conversions</td>
                  <td className="py-2">98</td>
                  <td className="py-2">-0.8%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h4 className="font-semibold mb-2">Quick Analytics</h4>
            <div className="text-sm text-gray-600">A small set of quick stats and KPIs.</div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h4 className="font-semibold mb-2">Revenue vs Payout</h4>
            <div className="h-28 bg-gray-50 rounded-md flex items-center justify-center">Comparison chart</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsSection() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const resp = await api.get('/stats')
        if (!mounted) return
        setStats(resp.data)
      } catch (err) {
        console.error('Failed to load dashboard stats', err)
        if (mounted) setError(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  const cards = [
    { title: 'Clicks', key: 'totalClicks', sub: 'Total clicks' },
    { title: 'Commissions', key: 'totalCommissions', sub: 'Commission records' },
    { title: 'Earnings', key: 'totalEarnings', sub: 'Total earnings' },
    { title: 'Products', key: 'totalProducts', sub: 'Your products' }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {loading ? (
        <div className="col-span-4 flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : error ? (
        <div className="col-span-4 card text-center py-8">
          <p className="text-red-600">Failed to load stats</p>
        </div>
      ) : (
        cards.map((c) => (
          <div key={c.key} className="bg-white rounded-xl shadow-md overflow-hidden h-56 flex flex-col">
            <div className="h-28 bg-gray-200" />
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold">{c.title}</h3>
                <div className="text-2xl font-bold mt-2">{(stats && (stats[c.key] ?? '—'))}</div>
                <div className="text-sm text-gray-500 mt-1">{c.sub}</div>
              </div>
              <div className="mt-4">
                <button className="px-3 py-2 bg-blue-600 text-white rounded-md">Manage</button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

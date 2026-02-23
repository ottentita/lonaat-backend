import React, { useEffect, useState } from 'react'
import RealEstateListingCard from './RealEstateListingCard'
import RealEstateMap from './RealEstateMap'
import { realEstateAPI } from '../../services/api'

export default function RealEstateDashboard() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Prefer official marketplace endpoint; attach auth token via api instance
        let resp
        try {
          resp = await realEstateAPI.getMarketplace()
        } catch (e) {
          // fallback to analytics listing if available
          try {
            resp = await (await import('../../services/api')).api.get('/real-estate/marketplace')
          } catch (e2) {
            resp = e
          }
        }

        const data = resp?.data || {}
        const raw = data.properties || data.listings || data.results || []

        const items = Array.isArray(raw)
          ? raw.map((p) => ({
              id: p.id || p._id || p.listing_id,
              title: p.title || p.name || 'Untitled',
              price: p.price != null ? (typeof p.price === 'number' ? p.price : Number(p.price) || p.price) : null,
              location: p.location || [p.city, p.region].filter(Boolean).join(', '),
              bedrooms: p.bedrooms ?? p.beds ?? null,
              bathrooms: p.bathrooms ?? p.baths ?? null,
              image: (p.images && p.images.length > 0 && p.images[0]) || p.image || p.image_url || '/placeholder-400x300.png',
              status: p.status || 'approved',
              raw: p,
            }))
          : []

        if (mounted) setListings(items)
      } catch (err) {
        console.error('Real estate load error', err)
        if (mounted) setError(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input type="search" placeholder="Search properties, locations..." className="w-full border rounded px-4 py-2" />
        </div>
        <div>
          <select className="border rounded px-3 py-2">
            <option>Sort: Recommended</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="loader">Loading listings...</div>
        </div>
      ) : error ? (
        <div className="card text-center py-8">
          <p className="text-red-600">Failed to load listings. Please try again later.</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No listings found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item) => (
            <RealEstateListingCard key={item.id || item._id || item.listing_id} item={item} />
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold mb-3">Map</h3>
        <div className="h-[300px]"><RealEstateMap listings={listings} /></div>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { landRegistryAPI } from '../../services/api'

export default function RealEstateMap({ listings = [] }) {
  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    async function loadMap() {
      setLoading(true)
      try {
        const resp = await landRegistryAPI.getMapData()
        if (mounted) setMapData(resp?.data || null)
      } catch (err) {
        // silent fallback — we still render marker summary from listings
        console.debug('No land-registry map available', err?.message || err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadMap()
    return () => { mounted = false }
  }, [])

  const markersCount = (mapData?.markers?.length || listings?.length || 0)

  return (
    <div className="h-64 bg-gray-200 rounded-md flex items-center justify-center">
      {loading ? (
        <span className="text-gray-600">Loading map…</span>
      ) : markersCount > 0 ? (
        <div className="text-gray-700">Map with {markersCount} marker{markersCount>1? 's' : ''}</div>
      ) : (
        <span className="text-gray-600">Map placeholder</span>
      )}
    </div>
  )
}


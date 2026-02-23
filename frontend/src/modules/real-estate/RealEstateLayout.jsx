import React from 'react'
import RealEstateFilters from './RealEstateFilters'
import RealEstateDashboard from './RealEstateDashboard'

export default function RealEstateLayout() {
  return (
    <div className="flex h-full">
      <aside className="w-[280px] bg-white rounded-xl shadow-md p-6">
        <RealEstateFilters />
      </aside>

      <main className="flex-1 bg-gray-100 p-6 overflow-y-auto">
        <RealEstateDashboard />
      </main>
    </div>
  )
}

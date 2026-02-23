import React from 'react'

export default function RealEstateFilters() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Filters</h3>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">Location</label>
        <select className="w-full border rounded px-3 py-2">
          <option>Any</option>
          <option>City Center</option>
          <option>Suburbs</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">Price Range</label>
        <select className="w-full border rounded px-3 py-2">
          <option>Any</option>
          <option>$0 - $100k</option>
          <option>$100k - $300k</option>
          <option>$300k+</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">Property Type</label>
        <select className="w-full border rounded px-3 py-2">
          <option>Any</option>
          <option>Apartment</option>
          <option>House</option>
          <option>Land</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">Bedrooms</label>
        <select className="w-full border rounded px-3 py-2">
          <option>Any</option>
          <option>1+</option>
          <option>2+</option>
          <option>3+</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">Bathrooms</label>
        <select className="w-full border rounded px-3 py-2">
          <option>Any</option>
          <option>1+</option>
          <option>2+</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">Amenities</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2"><input type="checkbox" /> Pool</label>
          <label className="flex items-center gap-2"><input type="checkbox" /> Garage</label>
          <label className="flex items-center gap-2"><input type="checkbox" /> Garden</label>
        </div>
      </div>

      <div className="mb-4">
        <label className="flex items-center gap-2"><input type="checkbox" /> Verified Listings</label>
      </div>

      <div>
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md">Apply</button>
      </div>
    </div>
  )
}

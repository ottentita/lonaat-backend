import React from 'react'

export default function RealEstateListingCard({ item }) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden h-full flex flex-col">
      <div className="h-48 w-full bg-gray-200">
        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-semibold">{item.title}</h4>
          <div className="text-sm text-gray-500 mt-1">{item.location}</div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">{item.price != null ? (typeof item.price === 'number' ? `$${item.price}` : item.price) : '—'}</div>
            <div className="text-sm text-gray-500">{(item.bedrooms ?? '—')} beds • {(item.bathrooms ?? '—')} baths</div>
            <div className="text-xs text-gray-400 mt-1">Status: {item.status}</div>
          </div>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md">View</button>
        </div>
      </div>
    </div>
  )
}

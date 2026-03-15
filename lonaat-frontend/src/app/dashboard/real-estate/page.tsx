
"use client";
import DashboardLayout from "@/layouts/DashboardLayout";
import PropertyCard from "@/components/PropertyCard";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import PropertyFilterBar from "@/components/PropertyFilterBar";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { useState } from "react";

// Advanced search/filter UI
type PropertySearchBarProps = {
  search: string;
  onSearch: (value: string) => void;
  location: string;
  onLocation: (value: string) => void;
  priceRange: string;
  onPriceRange: (value: string) => void;
};

function PropertySearchBar({ search, onSearch, location, onLocation, priceRange, onPriceRange }: PropertySearchBarProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-4 items-center">
      <input
        type="text"
        placeholder="Search properties..."
        value={search}
        onChange={e => onSearch(e.target.value)}
        className="border rounded px-3 py-1 text-sm"
      />
      <input
        type="text"
        placeholder="Location"
        value={location}
        onChange={e => onLocation(e.target.value)}
        className="border rounded px-3 py-1 text-sm"
      />
      <select
        value={priceRange}
        onChange={e => onPriceRange(e.target.value)}
        className="border rounded px-3 py-1 text-sm"
      >
        <option value="">Price Range</option>
        <option value="0-100000">$0 - $100,000</option>
        <option value="100000-300000">$100,000 - $300,000</option>
        <option value="300000-1000000">$300,000 - $1,000,000</option>
        <option value=">1000000">$1,000,000+</option>
      </select>
    </div>
  );
}

export default function RealEstateDashboard() {
  // Mock data
  const categories = ["All", "Land", "Plots", "Houses", "Commercial Property"];
  const allProperties = [
    {
      title: "3BR Apartment Downtown",
      imageUrl: "https://placehold.co/400x200",
      price: "$250,000",
      location: "Lagos",
      category: "Houses",
      description: "Modern 3-bedroom apartment in the city center.",
      seller: "John Doe",
      contact: "john@example.com",
    },
    {
      title: "Prime Land Plot",
      imageUrl: "https://placehold.co/400x200",
      price: "$80,000",
      location: "Abuja",
      category: "Land",
      description: "Spacious land plot suitable for development.",
      seller: "Jane Smith",
      contact: "jane@example.com",
    },
    {
      title: "Office Space",
      imageUrl: "https://placehold.co/400x200",
      price: "$500,000",
      location: "Port Harcourt",
      category: "Commercial Property",
      description: "Large office space in business district.",
      seller: "Acme Corp",
      contact: "info@acme.com",
    },
  ];
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  // Advanced search/filter state
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [priceRange, setPriceRange] = useState("");

  let filteredProperties = selectedCategory === "All" ? allProperties : allProperties.filter(p => p.category === selectedCategory);
  if (search) filteredProperties = filteredProperties.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
  if (location) filteredProperties = filteredProperties.filter(p => p.location.toLowerCase().includes(location.toLowerCase()));
  if (priceRange) {
    filteredProperties = filteredProperties.filter(p => {
      const price = parseInt(p.price.replace(/\D/g, ""));
      if (priceRange === "0-100000") return price <= 100000;
      if (priceRange === "100000-300000") return price > 100000 && price <= 300000;
      if (priceRange === "300000-1000000") return price > 300000 && price <= 1000000;
      if (priceRange === ">1000000") return price > 1000000;
      return true;
    });
  }

  // Mock loading/error state
  const [loading, setLoading] = useState(false); // set true to simulate loading
  const [error, setError] = useState(""); // set to a string to simulate error

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Real Estate Marketplace</h1>
      <PropertySearchBar
        search={search}
        onSearch={setSearch}
        location={location}
        onLocation={setLocation}
        priceRange={priceRange}
        onPriceRange={setPriceRange}
      />
      <PropertyFilterBar categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
      {loading ? (
        <LoadingState message="Loading properties..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : filteredProperties.length === 0 ? (
        <EmptyState message="No properties found." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {filteredProperties.map((p) => (
            <PropertyCard
              key={p.title}
              {...p}
              onView={() => {
                setSelectedProperty(p);
                setModalOpen(true);
              }}
            />
          ))}
        </div>
      )}
      <button className="px-4 py-2 bg-blue-600 text-white rounded">Add New Property</button>
      <PropertyDetailModal open={modalOpen} onClose={() => setModalOpen(false)} property={selectedProperty || allProperties[0]} />
    </DashboardLayout>
  );
}

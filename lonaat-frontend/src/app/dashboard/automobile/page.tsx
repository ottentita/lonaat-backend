
"use client";
import DashboardLayout from "@/layouts/DashboardLayout";
import VehicleCard from "@/components/VehicleCard";
import VehicleDetailModal from "@/components/VehicleDetailModal";
import VehicleFilterBar from "@/components/VehicleFilterBar";
import VehicleSearchSortBar from "@/components/VehicleSearchSortBar";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { useState } from "react";

// Advanced search/filter UI
type AutomobileSearchBarProps = {
  search: string;
  onSearch: (value: string) => void;
  year: string;
  onYear: (value: string) => void;
  priceRange: string;
  onPriceRange: (value: string) => void;
};

function AutomobileSearchBar({ search, onSearch, year, onYear, priceRange, onPriceRange }: AutomobileSearchBarProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-4 items-center">
      <input
        type="text"
        placeholder="Search vehicles..."
        value={search}
        onChange={e => onSearch(e.target.value)}
        className="border rounded px-3 py-1 text-sm"
      />
      <input
        type="text"
        placeholder="Year"
        value={year}
        onChange={e => onYear(e.target.value)}
        className="border rounded px-3 py-1 text-sm"
      />
      <select
        value={priceRange}
        onChange={e => onPriceRange(e.target.value)}
        className="border rounded px-3 py-1 text-sm"
      >
        <option value="">Price Range</option>
        <option value="0-10000">$0 - $10,000</option>
        <option value="10000-20000">$10,000 - $20,000</option>
        <option value="20000-50000">$20,000 - $50,000</option>
        <option value=">50000">$50,000+</option>
      </select>
    </div>
  );
}

export default function AutomobileDashboard() {
  // Mock data
  const brands = ["All", "Toyota", "Honda", "Mercedes", "BMW", "Yamaha", "Power Bikes"];
  const allVehicles = [
    {
      brand: "Toyota",
      model: "Corolla 2020",
      imageUrl: "https://placehold.co/400x200",
      price: "$15,000",
      year: "2020",
      location: "Lagos",
      description: "Reliable sedan, low mileage.",
      seller: "AutoHub",
      contact: "sales@autohub.com",
    },
    {
      brand: "Honda",
      model: "Civic 2019",
      imageUrl: "https://placehold.co/400x200",
      price: "$13,500",
      year: "2019",
      location: "Abuja",
      description: "Sporty and efficient.",
      seller: "Jane Cars",
      contact: "jane@cars.com",
    },
    {
      brand: "BMW",
      model: "X5 2021",
      imageUrl: "https://placehold.co/400x200",
      price: "$45,000",
      year: "2021",
      location: "Port Harcourt",
      description: "Luxury SUV, fully loaded.",
      seller: "BMW Dealer",
      contact: "info@bmwdealer.com",
    },
  ];
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [sort, setSort] = useState("Newest");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const sortOptions = ["Newest", "Price: Low to High", "Price: High to Low", "Year: Newest", "Year: Oldest"];
  let filteredVehicles = selectedBrand === "All" ? allVehicles : allVehicles.filter(v => v.brand === selectedBrand);
  if (search) filteredVehicles = filteredVehicles.filter(v => v.model.toLowerCase().includes(search.toLowerCase()));
  if (year) filteredVehicles = filteredVehicles.filter(v => v.year.includes(year));
  if (priceRange) {
    filteredVehicles = filteredVehicles.filter(v => {
      const price = parseInt(v.price.replace(/\D/g, ""));
      if (priceRange === "0-10000") return price <= 10000;
      if (priceRange === "10000-20000") return price > 10000 && price <= 20000;
      if (priceRange === "20000-50000") return price > 20000 && price <= 50000;
      if (priceRange === ">50000") return price > 50000;
      return true;
    });
  }
  if (sort === "Price: Low to High") filteredVehicles = [...filteredVehicles].sort((a, b) => parseInt(a.price.replace(/\D/g, "")) - parseInt(b.price.replace(/\D/g, "")));
  if (sort === "Price: High to Low") filteredVehicles = [...filteredVehicles].sort((a, b) => parseInt(b.price.replace(/\D/g, "")) - parseInt(a.price.replace(/\D/g, "")));
  if (sort === "Year: Newest") filteredVehicles = [...filteredVehicles].sort((a, b) => parseInt(b.year) - parseInt(a.year));
  if (sort === "Year: Oldest") filteredVehicles = [...filteredVehicles].sort((a, b) => parseInt(a.year) - parseInt(b.year));

  // Mock loading/error state
  const [loading, setLoading] = useState(false); // set true to simulate loading
  const [error, setError] = useState(""); // set to a string to simulate error

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Automobile Marketplace</h1>
      <AutomobileSearchBar
        search={search}
        onSearch={setSearch}
        year={year}
        onYear={setYear}
        priceRange={priceRange}
        onPriceRange={setPriceRange}
      />
      <VehicleFilterBar brands={brands} selected={selectedBrand} onSelect={setSelectedBrand} />
      <VehicleSearchSortBar search={search} onSearch={setSearch} sort={sort} onSort={setSort} sortOptions={sortOptions} />
      {loading ? (
        <LoadingState message="Loading vehicles..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : filteredVehicles.length === 0 ? (
        <EmptyState message="No vehicles found." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {filteredVehicles.map((v) => (
            <VehicleCard
              key={v.model}
              {...v}
              onView={() => {
                setSelectedVehicle(v);
                setModalOpen(true);
              }}
            />
          ))}
        </div>
      )}
      <button className="px-4 py-2 bg-blue-600 text-white rounded">Add Vehicle</button>
      <VehicleDetailModal open={modalOpen} onClose={() => setModalOpen(false)} vehicle={selectedVehicle || allVehicles[0]} />
    </DashboardLayout>
  );
}

"use client";
import Sidebar from "@/components/Sidebar";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import { useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  function handleGlobalSearch(query: string) {
    setSearching(true);
    setSearchError("");
    // Simulate search across mock data (replace with real API later)
    setTimeout(() => {
      // Example: search in mock data from all marketplaces
      // In real app, fetch from API
      const affiliate = [
        { type: "Affiliate", title: "Affiliate product: Smart Watch", id: 1 },
        { type: "Affiliate", title: "Affiliate product: Yoga Mat", id: 2 },
      ];
      const realEstate = [
        { type: "Real Estate", title: "House in Yaoundé", id: 3 },
        { type: "Real Estate", title: "2BR Apartment in Douala", id: 4 },
      ];
      const automobile = [
        { type: "Automobile", title: "Toyota Corolla 2020", id: 5 },
        { type: "Automobile", title: "Honda Civic 2019", id: 6 },
      ];
      const all = [...affiliate, ...realEstate, ...automobile];
      const q = query.toLowerCase();
      const results = all.filter(item => item.title.toLowerCase().includes(q));
      setSearchResults(results);
      setSearching(false);
      if (results.length === 0) setSearchError("No results found.");
    }, 600);
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="px-4 pt-4 pb-2 bg-gray-50 sticky top-0 z-20">
          <GlobalSearchBar onSearch={handleGlobalSearch} />
        </div>
        {searchResults ? (
          <div className="flex-1 p-8">
            <h2 className="text-lg font-semibold mb-4">Search Results</h2>
            {searching ? (
              <div className="text-gray-500">Searching...</div>
            ) : searchResults.length === 0 ? (
              <div className="text-gray-400">{searchError || "No results found."}</div>
            ) : (
              <ul className="space-y-2">
                {searchResults.map((item, idx) => (
                  <li key={item.id} className="bg-white rounded shadow p-4 flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded px-2 py-1 mr-2">{item.type}</span>
                    <span className="font-medium">{item.title}</span>
                  </li>
                ))}
              </ul>
            )}
            <button className="mt-6 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={() => setSearchResults(null)}>Back to dashboard</button>
          </div>
        ) : (
          <main className="flex-1 p-8 overflow-y-auto">{children}</main>
        )}
      </div>
    </div>
  );
}

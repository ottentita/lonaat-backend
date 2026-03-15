
"use client";

import DashboardLayout from "@/layouts/DashboardLayout";
import AffiliateNetworkCard from "@/components/AffiliateNetworkCard";
import ProductCard from "@/components/ProductCard";
import CampaignCard from "@/components/CampaignCard";
import FilterBar from "@/components/FilterBar";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { useState, useEffect } from "react";
import { marketplaceService } from "@/services/marketplaceService";

export default function AffiliatePage() {
  // API-driven data
  const [networks, setNetworks] = useState<any[]>([]); // Placeholder, update if backend provides
  const [products, setProducts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]); // Placeholder, update if backend provides
  const [selectedNetwork, setSelectedNetwork] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    marketplaceService.getAffiliateListings()
      .then((res) => {
        setProducts(res.data.products || res.data || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load affiliate products.");
        setLoading(false);
      });
  }, []);

  const productFilters = ["All", ...networks.map((n) => n.name)];
  const filteredProducts = selectedNetwork === "All" ? products : products.filter((p: any) => p.network === selectedNetwork);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Affiliate Marketplace</h1>
      {/* Networks */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Affiliate Networks</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {networks.length === 0 ? <EmptyState message="No networks found." /> : networks.map((n) => (<AffiliateNetworkCard key={n.name} {...n} />))}
        </div>
      </section>
      {/* Product Discovery */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Product Discovery</h2>
        <FilterBar filters={productFilters} selected={selectedNetwork} onSelect={setSelectedNetwork} />
        {loading ? (
          <LoadingState message="Loading products..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : filteredProducts.length === 0 ? (
          <EmptyState message="No products found." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {filteredProducts.map((p: any) => (
              <ProductCard key={p.id || p.name} {...p} />
            ))}
          </div>
        )}
      </section>
      {/* Campaign Automation */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Campaign Automation</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded mb-4">Generate New Campaign</button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.length === 0 ? <EmptyState message="No campaigns found." /> : campaigns.map((c: any) => (<CampaignCard key={c.id || c.name} {...c} />))}
        </div>
      </section>
      {/* Campaign Performance Dashboard */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Campaign Performance</h2>
        <div className="bg-gradient-to-r from-green-100 to-blue-100 h-32 rounded flex items-center justify-center text-blue-700 font-bold text-lg">
          [Performance Chart Placeholder]
        </div>
      </section>
    </DashboardLayout>
  );
}

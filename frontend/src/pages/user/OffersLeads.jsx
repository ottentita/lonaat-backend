import { useState, useEffect, useMemo } from 'react';
import { offersAPI } from '@/services/api';
import toast from 'react-hot-toast';
import {
  Info,
  Star,
  TrendingUp,
  Loader2,
  Award,
  DollarSign,
  Zap
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import OfferCard from '@/components/OfferCard';
import FiltersBar from '@/components/FiltersBar';
import PromoteModal from '@/components/PromoteModal';

export default function OffersLeads() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [filters, setFilters] = useState({ category: 'all', minCommission: 0, sortBy: 'name' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await offersAPI.getOffers();
      setOffers(res.data.offers || []);
    } catch (err) {
      toast.error('Failed to load offers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and search
  const filtered = useMemo(() => {
    let result = [...offers];

    // Filter by category
    if (filters.category !== 'all') {
      result = result.filter((o) => o.category === filters.category);
    }

    // Filter by minimum commission
    if (filters.minCommission > 0) {
      result = result.filter((o) => (o.commission || 0) >= filters.minCommission);
    }

    // Filter by search term (name or description)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (o) =>
          (o.name && o.name.toLowerCase().includes(term)) ||
          (o.description && o.description.toLowerCase().includes(term))
      );
    }

    // Sort results
    switch (filters.sortBy) {
      case 'commission':
        result.sort((a, b) => (b.commission || 0) - (a.commission || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
      case 'name':
      default:
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return result;
  }, [offers, filters, searchTerm]);

  // Handle promote button click
  const handlePromote = (offer) => {
    setSelectedOffer(offer);
    setShowPromoteModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-dark-50">Offers & Leads</h1>
        <p className="text-dark-400 mt-2">Find lucrative offers to promote and earn commissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-dark-400 text-sm mb-1">Available Offers</p>
              <h3 className="text-2xl font-bold text-dark-50">{offers.length}</h3>
            </div>
            <Zap className="w-6 h-6 text-yellow-500 opacity-50" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-dark-400 text-sm mb-1">Avg Commission</p>
              <h3 className="text-2xl font-bold text-dark-50">
                {offers.length > 0
                  ? (offers.reduce((sum, o) => sum + (o.commission || 0), 0) / offers.length).toFixed(
                      1
                    )
                  : 0}
                %
              </h3>
            </div>
            <TrendingUp className="w-6 h-6 text-green-500 opacity-50" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-dark-400 text-sm mb-1">Categories</p>
              <h3 className="text-2xl font-bold text-dark-50">
                {[...new Set(offers.map((o) => o.category))].length}
              </h3>
            </div>
            <Award className="w-6 h-6 text-purple-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <FiltersBar
        categories={[...new Set(offers.map((o) => o.category))]}
        filters={filters}
        setFilters={setFilters}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Results Summary */}
      {(searchTerm || filters.category !== 'all' || filters.minCommission > 0) && (
        <div className="text-sm text-dark-400">
          Found <span className="font-semibold text-dark-200">{filtered.length}</span> offer
          {filtered.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Offers List or Empty State */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onPromote={handlePromote}
            />
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Info className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-dark-50 mb-2">No offers found</h3>
          <p className="text-dark-400">
            {offers.length === 0
              ? 'Check back later for new offers'
              : 'Try adjusting your filters or search terms'}
          </p>
        </div>
      )}

      {/* Promote Modal */}
      <PromoteModal
        show={showPromoteModal}
        onClose={() => setShowPromoteModal(false)}
        offer={selectedOffer}
      />
    </div>
  );
}

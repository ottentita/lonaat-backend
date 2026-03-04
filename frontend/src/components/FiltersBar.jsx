import { Filter } from 'lucide-react';
import { Search } from 'lucide-react';

const FiltersBar = ({ categories, filters, setFilters, searchTerm, setSearchTerm }) => {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Filter className="w-5 h-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-dark-50">Filters & Search</h2>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-dark-500" />
        <input
          type="text"
          placeholder="Search offers by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10 w-full"
        />
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category Filter */}
        <div>
          <label className="block text-dark-300 text-sm font-medium mb-2">Category</label>
          <select
            className="input w-full"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Min Commission Filter */}
        <div>
          <label className="block text-dark-300 text-sm font-medium mb-2">
            Min Commission {filters.minCommission > 0 && `(${filters.minCommission}%)`}
          </label>
          <input
            type="number"
            className="input w-full"
            min="0"
            max="100"
            step="5"
            value={filters.minCommission}
            onChange={(e) =>
              setFilters({ ...filters, minCommission: parseFloat(e.target.value) || 0 })
            }
            placeholder="0%"
          />
        </div>

        {/* Sort Options */}
        <div>
          <label className="block text-dark-300 text-sm font-medium mb-2">Sort By</label>
          <select
            className="input w-full"
            value={filters.sortBy || 'name'}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          >
            <option value="name">Name (A-Z)</option>
            <option value="commission">Commission (High)</option>
            <option value="rating">Rating (High)</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {/* Active Filters Info */}
      {(filters.category !== 'all' || filters.minCommission > 0 || searchTerm) && (
        <div className="text-xs text-dark-400 pt-2 border-t border-dark-800">
          {[
            filters.category !== 'all' && `Category: ${filters.category}`,
            filters.minCommission > 0 && `Commission: ≥${filters.minCommission}%`,
            searchTerm && `Search: "${searchTerm}"`
          ]
            .filter(Boolean)
            .join(' • ')}
        </div>
      )}
    </div>
  );
};

export default FiltersBar;

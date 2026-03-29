# 🎨 FRONTEND STABILITY FIXES

## 📋 ISSUES IDENTIFIED

### 1. **AffiliateMarketplace Component** (`components/AffiliateMarketplace.tsx`)

**Current Issues**:
- ❌ No stable key for list rendering (uses `network.id` which is good)
- ❌ No sorting applied - networks render in API response order
- ❌ Filter buttons recalculate counts on every render
- ⚠️ Direct fetch without caching (no SWR/React Query)
- ✅ Has loading skeleton (good)

**Recommended Fixes**:

```typescript
// Add useMemo for filtered networks to prevent recalculation
const filteredNetworks = useMemo(() => {
  return networks
    .filter(network => {
      if (filter === 'all') return true;
      return network.status === filter;
    })
    .sort((a, b) => {
      // Stable sort: connected first, then by name
      if (a.status === 'connected' && b.status !== 'connected') return -1;
      if (a.status !== 'connected' && b.status === 'connected') return 1;
      return a.name.localeCompare(b.name);
    });
}, [networks, filter]);

// Memoize filter counts
const counts = useMemo(() => ({
  all: networks.length,
  connected: networks.filter(n => n.status === 'connected').length,
  disconnected: networks.filter(n => n.status === 'disconnected').length
}), [networks]);
```

**Add SWR for data fetching**:
```typescript
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AffiliateMarketplace() {
  const { data, error, isLoading } = useSWR(
    'http://localhost:4000/api/affiliate/networks',
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30s
  );

  const networks = data?.networks || [];
  // ... rest of component
}
```

---

### 2. **Marketplace Page** (needs review)

**File**: `app/dashboard/marketplace/page.tsx`

**Potential Issues**:
- Product list may not have stable sorting
- No pagination (could cause performance issues with 200+ products)
- May be fetching on every navigation

**Recommended Implementation**:

```typescript
'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';

interface Product {
  id: number;
  name: string;
  price: number;
  network: string;
  affiliateLink: string;
  externalId?: string;
  imageUrl?: string;
  category?: string;
}

export default function MarketplacePage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'network'>('name');
  const ITEMS_PER_PAGE = 20;

  const { data, error, isLoading } = useSWR(
    '/api/products',
    (url) => fetch(`http://localhost:4000${url}`).then(r => r.json()),
    { 
      revalidateOnFocus: false,
      dedupingInterval: 60000 // Cache for 1 minute
    }
  );

  const products: Product[] = data?.products || [];

  // Stable sort with pagination
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return (b.price || 0) - (a.price || 0);
        case 'network':
          return (a.network || '').localeCompare(b.network || '');
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [products, sortBy]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return sortedProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedProducts, page]);

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);

  if (isLoading) {
    return <ProductListSkeleton />;
  }

  return (
    <div>
      {/* Sort controls */}
      <div className="mb-4 flex gap-2">
        <button onClick={() => setSortBy('name')}>Sort by Name</button>
        <button onClick={() => setSortBy('price')}>Sort by Price</button>
        <button onClick={() => setSortBy('network')}>Sort by Network</button>
      </div>

      {/* Product grid with stable keys */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedProducts.map(product => (
          <ProductCard 
            key={product.id} // Stable ID
            product={product}
          />
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-center gap-2">
        <button 
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
        >
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button 
          disabled={page === totalPages}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## 🔧 REQUIRED DEPENDENCIES

```bash
npm install swr
# or
yarn add swr
```

---

## ✅ STABILITY CHECKLIST

- [ ] Add SWR or React Query for data fetching
- [ ] Implement stable sorting (by ID or createdAt as fallback)
- [ ] Add useMemo for filtered/sorted lists
- [ ] Implement pagination (20-50 items per page)
- [ ] Use stable keys in .map() (product.id, not index)
- [ ] Add loading skeletons
- [ ] Prevent unnecessary re-renders with useMemo/useCallback
- [ ] Add error boundaries for failed API calls

---

## 🎯 PERFORMANCE OPTIMIZATIONS

### 1. **Virtualization for Large Lists**
If product count exceeds 100, consider using `react-window`:

```typescript
import { FixedSizeGrid } from 'react-window';

<FixedSizeGrid
  columnCount={3}
  columnWidth={300}
  height={600}
  rowCount={Math.ceil(products.length / 3)}
  rowHeight={400}
  width={1000}
>
  {({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * 3 + columnIndex;
    const product = products[index];
    return product ? (
      <div style={style}>
        <ProductCard product={product} />
      </div>
    ) : null;
  }}
</FixedSizeGrid>
```

### 2. **Image Lazy Loading**
```typescript
<img 
  src={product.imageUrl} 
  loading="lazy"
  alt={product.name}
/>
```

### 3. **Debounced Search**
```typescript
import { useDebouncedValue } from '@mantine/hooks';

const [search, setSearch] = useState('');
const [debouncedSearch] = useDebouncedValue(search, 300);

const filteredProducts = useMemo(() => {
  return products.filter(p => 
    p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );
}, [products, debouncedSearch]);
```

---

## 📊 TESTING STABILITY

### Test for Flickering:
1. Load marketplace page
2. Switch between filters rapidly
3. Scroll up and down
4. Navigate away and back
5. Check if product positions remain stable

### Test for Performance:
1. Import 200 products
2. Load marketplace
3. Check render time (should be < 100ms)
4. Check for console warnings
5. Monitor memory usage

---

## 🚀 IMPLEMENTATION PRIORITY

1. **HIGH**: Add stable sorting (by ID)
2. **HIGH**: Implement pagination
3. **MEDIUM**: Add SWR for caching
4. **MEDIUM**: Add useMemo for expensive calculations
5. **LOW**: Add virtualization (only if >100 products)


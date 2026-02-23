import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { marketAPI } from '@/services/api'
import { formatCurrency } from '@/lib/currency'

export default function Marketplace() {
  const [categories, setCategories] = useState([])
  const [featured, setFeatured] = useState([])

  useEffect(() => {
    load()
  }, [])

  const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')

  async function load() {
    try {
      const [catRes, prodRes] = await Promise.all([
        marketAPI.getCategories(),
        marketAPI.getListings({ limit: 8 })
      ])
      setCategories(catRes.data.categories || [])
      setFeatured(prodRes.data.products || [])
    } catch (err) {
      console.error('Marketplace load error', err)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground">Browse categories and discover products</p>
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-3">Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map(cat => (
              <a key={cat.name} href={`/marketplace/${slugify(cat.name)}`} className="p-4 bg-dark-800 rounded-md"> 
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-dark-700 flex items-center justify-center">🏷️</div>
                  <div>
                    <div className="font-medium">{cat.name}</div>
                    <div className="text-sm text-muted-foreground">{cat.product_count || 0} products</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Featured Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featured.map(p => (
              <div key={p.id} className="card p-4">
                <div className="flex items-start gap-4">
                  <img src={p.image_url || '/logo512.png'} className="w-20 h-20 object-cover rounded" alt="" />
                  <div className="flex-1">
                    <h3 className="font-medium">{p.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                    <div className="mt-3 font-semibold">{p.price != null ? formatCurrency(p.price, p.currency || 'USD') : '—'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { marketAPI } from '@/services/api'
import { formatCurrency } from '@/lib/currency'

export default function CategoryPage() {
  const { slug } = useParams()
  const [categoryName, setCategoryName] = useState('')
  const [products, setProducts] = useState([])

  useEffect(() => {
    if (!slug) return

    async function load() {
      try {
        const res = await marketAPI.getListings({ category: slug })
        setProducts(res.data.products || [])
        setCategoryName(slug.replace(/-/g, ' '))
      } catch (err) {
        console.error(err)
      }
    }

    load()
  }, [slug])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{categoryName || 'Category'}</h1>
          <p className="text-muted-foreground">Listings in this category</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map(p => (
            <div key={p.id} className="card p-4">
              <h3 className="font-medium">{p.name}</h3>
              <p className="text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-2">{p.price ? formatCurrency(p.price, p.currency || 'USD') : '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

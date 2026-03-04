import { useState, useEffect } from 'react';
import { productsAPI, offersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { parseNumericInput } from '../../lib/currency';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Download,
  ExternalLink,
  Loader2,
  X,
  Search,
  ShoppingCart,
} from 'lucide-react';

const Products = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    network: '',
    commission_rate: '',
    description: '',
  });
  const [importData, setImportData] = useState({
    network: 'digistore24',
    offer_id: '',
    earn_mode: 'auto',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productsAPI.getAll();
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Failed to load products', error);
      setError(error);
      toast.error('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, formData);
        toast.success('Product updated successfully');
      } else {
        await productsAPI.create(formData);
        toast.success('Product added successfully');
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({ name: '', url: '', network: '', commission_rate: '', description: '' });
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save product');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      url: product.url || '',
      network: product.network || '',
      commission_rate: product.commission_rate || '',
      description: product.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
      await productsAPI.delete(id);
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleSearchOffers = async (e) => {
    e.preventDefault();
    if (!importData.network) {
      toast.error('Please select a network');
      return;
    }

    try {
      setSearchLoading(true);
      const response = await offersAPI.getOffers(importData.network, searchQuery);
      const products = response?.data?.products || response?.data?.offers || [];
      setSearchResults(products);
      if (products.length === 0) {
        toast('No offers found', { icon: '🔍' });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleImportOffer = async (offer) => {
    try {
      const importPayload = {
        external_id: offer.id || offer.offer_id,
        title: offer.name || offer.title,
        price: parseNumericInput(offer.price),
        currency: offer.currency || 'USD',
        image: offer.image_url || offer.image,
        affiliate_url: offer.affiliate_link || offer.url,
        category: offer.category || 'General',
        network: importData.network,
        earn_mode: importData.earn_mode,
      };
      await offersAPI.importOffer(importPayload);
      toast.success('Product imported!');
      setShowImportModal(false);
      setSearchResults([]);
      setSearchQuery('');
      fetchProducts();
    } catch (err) {
      toast.error('Import failed');
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-dark-400 mt-1">Manage your affiliate products</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Import
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add
          </button>
        </div>
      </div>

      {error ? (
        <div className="card text-center py-12">
          <p className="text-red-600">Failed to load products</p>
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="card bg-white rounded-xl shadow-md p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold">{product.name}</h3>
                <span className="text-xs text-gray-500">{product.network}</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{product.description || 'No description'}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(product)}
                  className="btn-secondary flex-1 flex items-center justify-center gap-1"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="btn-danger flex items-center justify-center p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No products</h3>
          <button onClick={() => setShowImportModal(true)} className="btn-primary mt-4">
            Import Now
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingProduct ? 'Edit' : 'Add'} Product</h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Product Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                required
              />
              <input
                type="url"
                placeholder="URL"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="input"
                required
              />
              <select
                value={formData.network}
                onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                className="input"
                required
              >
                <option value="">Select Network</option>
                <option value="digistore24">Digistore24</option>
                <option value="awin">Awin</option>
              </select>
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows="3"
              />
              <button type="submit" className="btn-primary w-full">
                Save
              </button>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Import Products</h2>
              <button onClick={() => setShowImportModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <select
                value={importData.network}
                onChange={(e) => setImportData({ ...importData, network: e.target.value })}
                className="input"
              >
                <option value="digistore24">Digistore24</option>
                <option value="awin">Awin</option>
              </select>

              <form onSubmit={handleSearchOffers} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input flex-1"
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="btn-primary"
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((offer, i) => (
                    <div key={i} className="p-3 border rounded flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-sm">{offer.name}</p>
                        <p className="text-xs text-gray-500">${offer.price}</p>
                      </div>
                      <button
                        onClick={() => handleImportOffer(offer)}
                        className="btn-primary text-sm"
                      >
                        Import
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;

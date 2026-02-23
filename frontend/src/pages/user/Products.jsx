import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { productsAPI, offersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { parseNumericInput } from '../../lib/currency';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Download,
  MousePointerClick,
  ExternalLink,
  Loader2,
  X,
  Search,
  ShoppingCart,
  Zap
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
    description: ''
  });
  const [importData, setImportData] = useState({
    network: 'digistore24',
    offer_id: '',
    earn_mode: 'auto'
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
      description: product.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await productsAPI.delete(id);
      toast.success('Product deleted successfully');
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
        toast('No offers found. Try a different search term.', { icon: '🔍' });
      }
    } catch (error) {
      console.error('Search error:', error?.response?.data || error?.message || error);
      const errorMsg = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to search offers';
      toast.error(errorMsg);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleImportOffer = async (offer) => {
    try {
      const importPayload = {
        external_id: offer.id || offer.offer_id,
        title: offer.name || offer.title || offer.description?.slice(0, 50),
        price: parseNumericInput(offer.price),
        currency: offer.currency || 'USD',
        image: offer.image_url || offer.image,
        affiliate_url: offer.affiliate_link || offer.url || offer.extra_data?.raw?.clickThroughUrl,
        category: offer.category || 'General',
        network: importData.network,
        earn_mode: importData.earn_mode
      };
      await offersAPI.importOffer(importPayload);
      toast.success(`Product imported successfully in ${importData.earn_mode} mode!`);
      setShowImportModal(false);
      setSearchResults([]);
      setSearchQuery('');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to import offer');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Products</h1>
            <p className="text-dark-400 mt-1">Import and manage products from Digistore24, Awin, and AliExpress</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Import from Network
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Manually
            </button>
          </div>
        </div>

        {error ? (
          <div className="card text-center py-12">
            <p className="text-red-600">Failed to load products. Please try again.</p>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="card-hover bg-white rounded-xl shadow-md overflow-hidden h-full flex flex-col">
                <div className="h-40 w-full bg-gray-200">
                  <img src={product.image || product.image_url || product.thumbnail || '/placeholder-400x300.png'} alt={product.title || product.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{product.title || product.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{product.category || product.network || ''}</p>
                    <p className="text-dark-400 text-sm mt-2 line-clamp-2">{product.description || 'No description'}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold">{product.price !== undefined && product.price !== null ? (typeof product.price === 'number' ? `$${product.price}` : product.price) : '—'}</div>
                      <div className="text-sm text-gray-500">Status: {product.is_active === false ? 'Inactive' : 'Active'}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={product.affiliate_link || product.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary flex items-center justify-center gap-2 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View
                      </a>
                      <button
                        onClick={() => handleEdit(product)}
                        className="btn-secondary flex items-center justify-center p-2"
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Package className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No products yet</h3>
            <p className="text-dark-400 mb-6">Import products from Digistore24, Awin, MyLead, AliExpress, or Admitad to get started</p>
            <button onClick={() => setShowImportModal(true)} className="btn-primary">
              <Download className="w-5 h-5 inline mr-2" />
              Import from Network
            </button>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </h2>
                <button onClick={() => { setShowModal(false); setEditingProduct(null); }}>
                  <X className="w-6 h-6 text-dark-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Product Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Affiliate URL</label>
                  <input
                    type="url"
                    className="input"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Network</label>
                  <select
                    className="input"
                    value={formData.network}
                    onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                    required
                  >
                    <option value="">Select network</option>
                    <option value="digistore24">Digistore24</option>
                    <option value="awin">Awin</option>
                    <option value="mylead">MyLead</option>
                    <option value="aliexpress">AliExpress</option>
                    <option value="admitad">Admitad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Commission Rate (%)</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Description</label>
                  <textarea
                    className="input"
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1">
                    {editingProduct ? 'Update' : 'Add'} Product
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingProduct(null); }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Import Products</h2>
                <button onClick={() => { setShowImportModal(false); setSearchResults([]); }}>
                  <X className="w-6 h-6 text-dark-400" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-dark-300 text-sm mb-2">Affiliate Network</label>
                    <select
                      className="input"
                      value={importData.network}
                      onChange={(e) => setImportData({ ...importData, network: e.target.value })}
                    >
                      <option value="digistore24">Digistore24</option>
                      <option value="awin">Awin</option>
                      <option value="mylead">MyLead</option>
                      <option value="aliexpress">AliExpress</option>
                      <option value="admitad">Admitad</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-dark-300 text-sm mb-2">Earn Mode</label>
                    <select
                      className="input"
                      value={importData.earn_mode}
                      onChange={(e) => setImportData({ ...importData, earn_mode: e.target.value })}
                    >
                      <option value="auto">Auto (Commission Tracking)</option>
                      <option value="manual">Manual (No Tracking)</option>
                    </select>
                  </div>
                </div>

                <form onSubmit={handleSearchOffers} className="flex gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder="Search for products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    className="btn-primary flex items-center gap-2"
                    disabled={searchLoading}
                  >
                    {searchLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                    Search
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <h3 className="font-semibold text-sm text-dark-300">
                      Found {searchResults.length} offers from {importData.network}
                    </h3>
                    {searchResults.map((offer, index) => (
                      <div key={index} className="border border-dark-700 rounded-lg p-4 hover:border-primary-500/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{offer.name}</h4>
                            <div className="flex items-center gap-4 text-xs text-dark-400">
                              <span>💰 {offer.price}</span>
                              <span>📊 {offer.commission}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleImportOffer(offer)}
                            className="btn-primary text-sm flex items-center gap-1"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Import
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.length === 0 && searchQuery && !searchLoading && (
                  <div className="text-center py-8 text-dark-400">
                    <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No offers found. Try a different search term.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Products;

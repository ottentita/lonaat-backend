import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { productsAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Download,
  MousePointerClick,
  ExternalLink,
  Loader2,
  X
} from 'lucide-react';

const Products = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
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
    network: '',
    api_key: '',
    product_ids: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll();
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
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

  const handleImport = async (e) => {
    e.preventDefault();
    try {
      await productsAPI.import(importData);
      toast.success('Products imported successfully');
      setShowImportModal(false);
      setImportData({ network: '', api_key: '', product_ids: '' });
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to import products');
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
            <h1 className="text-3xl font-bold text-dark-50">My Products</h1>
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
              Add Product
            </button>
          </div>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="card-hover">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-dark-50">{product.name}</h3>
                    <p className="text-primary-500 text-sm mt-1">{product.network}</p>
                  </div>
                  <div className="p-2 bg-primary-500/10 rounded-lg">
                    <Package className="w-5 h-5 text-primary-500" />
                  </div>
                </div>

                <p className="text-dark-400 text-sm mb-4 line-clamp-2">
                  {product.description || 'No description'}
                </p>

                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1 text-green-500">
                    <MousePointerClick className="w-4 h-4" />
                    <span>{product.clicks || 0} clicks</span>
                  </div>
                  <div className="text-dark-400">
                    {product.commission_rate}% commission
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
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
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Package className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-dark-50 mb-2">No products yet</h3>
            <p className="text-dark-400 mb-6">Add your first product to get started</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-5 h-5 inline mr-2" />
              Add Product
            </button>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-dark-50">
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
                  <label className="block text-dark-300 text-sm mb-2">URL</label>
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
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Amazon, ClickBank"
                    value={formData.network}
                    onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                    required
                  />
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
            <div className="card max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-dark-50">Import Products</h2>
                <button onClick={() => setShowImportModal(false)}>
                  <X className="w-6 h-6 text-dark-400" />
                </button>
              </div>
              <form onSubmit={handleImport} className="space-y-4">
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Network</label>
                  <select
                    className="input"
                    value={importData.network}
                    onChange={(e) => setImportData({ ...importData, network: e.target.value })}
                    required
                  >
                    <option value="">Select network</option>
                    <option value="amazon">Amazon</option>
                    <option value="clickbank">ClickBank</option>
                    <option value="shareasale">ShareASale</option>
                    <option value="cj">CJ Affiliate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-dark-300 text-sm mb-2">API Key</label>
                  <input
                    type="text"
                    className="input"
                    value={importData.api_key}
                    onChange={(e) => setImportData({ ...importData, api_key: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Product IDs (comma separated)</label>
                  <textarea
                    className="input"
                    rows="3"
                    placeholder="PROD1, PROD2, PROD3"
                    value={importData.product_ids}
                    onChange={(e) => setImportData({ ...importData, product_ids: e.target.value })}
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1">Import Products</button>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Products;

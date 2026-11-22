import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  QrCode,
  AlertTriangle,
  Package,
  Eye,
} from 'lucide-react';
import { productsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Table,
  ActionMenu,
  LoadingSpinner,
  EmptyState,
  Modal,
} from '../components/ui';
import { PRODUCT_CATEGORIES } from '../constants';
import { useLanguage } from '../context/LanguageContext';
import usePlanLimits from '../hooks/usePlanLimits';
import UpgradeModal from '../components/UpgradeModal';

const Products = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(searchParams.get('lowStock') === 'true');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Plan limits hook
  const { enforceLimit, upgradeModal, closeUpgradeModal } = usePlanLimits();

  const categoryOptions = [
    { value: '', label: t('common.all') + ' ' + t('products.category') },
    ...PRODUCT_CATEGORIES,
  ];

  useEffect(() => {
    fetchProducts();
  }, [pagination.page, category, showLowStock]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 20,
        ...(search && { search }),
        ...(category && { category }),
        ...(showLowStock && { lowStock: 'true' }),
      };
      const response = await productsAPI.getAll(params);
      setProducts(response.data.data);
      setPagination({
        page: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.total,
      });
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
  };

  const handleSearchSubmit = () => {
    fetchProducts();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await productsAPI.delete(id);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleViewDetails = (product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    // Check if user can add more products
    if (enforceLimit('products')) {
      navigate('/products/new');
    }
  };

  const getActionItems = (product) => [
    { label: 'View Details', icon: Eye, onClick: () => handleViewDetails(product) },
    { label: 'Edit', icon: Edit, href: `/products/${product._id}/edit` },
    { label: 'Generate Label', icon: QrCode, href: `/labels?product=${product._id}` },
    { label: 'Delete', icon: Trash2, onClick: () => handleDelete(product._id), variant: 'danger' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={t('products.title')}
        subtitle={t('products.subtitle')}
        actions={
          <Button onClick={handleAddProduct} icon={Plus}>
            {t('products.addProduct')}
          </Button>
        }
      />

      {/* Filters */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              placeholder="Search products by name, SKU..."
              className="input pl-10"
            />
          </div>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input sm:w-44 cursor-pointer"
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Low Stock Toggle */}
          <button
            type="button"
            onClick={() => setShowLowStock(!showLowStock)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
              showLowStock
                ? 'bg-danger text-white shadow-sm'
                : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
            }`}
            aria-pressed={showLowStock}
          >
            <AlertTriangle size={16} aria-hidden="true" />
            Low Stock
          </button>
        </div>
      </Card>

      {/* Products Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <LoadingSpinner.Container className="h-64" />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={search || category || showLowStock ? "No products match your filters" : "No products found"}
            description={search || category || showLowStock ? "Try adjusting your search or filters" : "Get started by adding your first product"}
            actionText="Add Product"
            actionLink="/products/new"
            actionIcon={Plus}
          />
        ) : (
          <>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.Header>Product</Table.Header>
                  <Table.Header>SKU</Table.Header>
                  <Table.Header>Category</Table.Header>
                  <Table.Header align="center">Quantity</Table.Header>
                  <Table.Header align="right">Unit Price</Table.Header>
                  <Table.Header align="center">Status</Table.Header>
                  <Table.Header align="center" className="w-16">Actions</Table.Header>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {products.map((product, index) => (
                  <Table.Row
                    key={product._id}
                    className="group hover:bg-secondary-50/50 transition-colors"
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <Table.Cell>
                      <Link
                        to={`/products/${product._id}/edit`}
                        className="flex items-center gap-3 hover:text-primary transition-colors"
                      >
                        {product.qrCode ? (
                          <img
                            src={product.qrCode}
                            alt=""
                            className="w-10 h-10 rounded-lg border border-secondary-200 bg-white p-0.5"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-secondary-100 flex items-center justify-center" aria-hidden="true">
                            <QrCode size={18} className="text-secondary-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-secondary group-hover:text-primary truncate transition-colors">
                            {product.name}
                          </p>
                          {product.description && (
                            <p className="text-xs text-secondary-500 truncate max-w-[200px]">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <code className="text-xs font-mono bg-secondary-100 text-secondary-700 px-2 py-1 rounded">
                        {product.sku}
                      </code>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="info" size="sm">{product.category}</Badge>
                    </Table.Cell>
                    <Table.Cell align="center">
                      <span className={`inline-flex items-center gap-1.5 font-medium ${
                        product.quantity <= product.reorderLevel
                          ? 'text-danger'
                          : product.quantity <= product.reorderLevel * 2
                          ? 'text-warning-dark'
                          : 'text-secondary'
                      }`}>
                        {product.quantity}
                        {product.quantity <= product.reorderLevel && (
                          <AlertTriangle size={14} className="text-danger" aria-label="Low stock warning" />
                        )}
                      </span>
                    </Table.Cell>
                    <Table.Cell align="right" className="font-semibold tabular-nums text-secondary">
                      ₹{product.unitPrice?.toLocaleString('en-IN')}
                    </Table.Cell>
                    <Table.Cell align="center">
                      <Badge variant={product.isActive ? 'success' : 'gray'} size="sm">
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell align="center">
                      <ActionMenu items={getActionItems(product)} />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>

            {/* Pagination */}
            <Table.Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={20}
              onPageChange={(page) => setPagination({ ...pagination, page })}
            />
          </>
        )}
      </Card>

      {/* Product Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Product Details"
        size="xl"
      >
        {selectedProduct && (
          <div className="space-y-0">
            {/* Header Section */}
            <div className="flex gap-5 pb-5 border-b border-secondary-100">
              {/* QR Code */}
              <div className="shrink-0">
                {selectedProduct.qrCode ? (
                  <img
                    src={selectedProduct.qrCode}
                    alt="QR Code"
                    className="w-24 h-24 rounded-xl border-2 border-secondary-100 bg-white p-1.5 shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-secondary-50 to-secondary-100 flex items-center justify-center border-2 border-secondary-100">
                    <QrCode size={36} className="text-secondary-300" />
                  </div>
                )}
              </div>
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-secondary leading-tight">{selectedProduct.name}</h3>
                    <p className="text-sm text-secondary-500 mt-0.5 font-mono">{selectedProduct.sku}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant={selectedProduct.isActive ? 'success' : 'gray'} size="sm">
                      {selectedProduct.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                {selectedProduct.description && (
                  <p className="text-sm text-secondary-500 mt-2 line-clamp-2">{selectedProduct.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    <Package size={12} />
                    {selectedProduct.category}
                  </span>
                  {selectedProduct.brand && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-600">
                      {selectedProduct.brand}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3 py-5 border-b border-secondary-100">
              <div className={`rounded-xl p-4 text-center ${
                selectedProduct.quantity <= selectedProduct.reorderLevel
                  ? 'bg-red-50 border border-red-100'
                  : 'bg-emerald-50 border border-emerald-100'
              }`}>
                <p className="text-2xl font-bold text-secondary">{selectedProduct.quantity}</p>
                <p className="text-xs text-secondary-500 mt-0.5">In Stock</p>
                {selectedProduct.quantity <= selectedProduct.reorderLevel && (
                  <span className="inline-flex items-center gap-1 text-xs text-red-600 mt-1">
                    <AlertTriangle size={10} /> Low
                  </span>
                )}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-secondary">₹{selectedProduct.unitPrice?.toLocaleString('en-IN') || 0}</p>
                <p className="text-xs text-secondary-500 mt-0.5">Unit Price</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-secondary">₹{selectedProduct.costPrice?.toLocaleString('en-IN') || 0}</p>
                <p className="text-xs text-secondary-500 mt-0.5">Cost Price</p>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-secondary">₹{((selectedProduct.unitPrice || 0) * selectedProduct.quantity).toLocaleString('en-IN')}</p>
                <p className="text-xs text-secondary-500 mt-0.5">Stock Value</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-0 py-5">
              {/* Left Column */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-secondary-400 uppercase tracking-wider">Product Information</h4>
                <div className="space-y-3">
                  <DetailRow label="HSN Code" value={selectedProduct.hsnCode || '-'} />
                  <DetailRow label="Unit" value={selectedProduct.unit || 'PCS'} />
                  <DetailRow label="Model Number" value={selectedProduct.modelNumber || '-'} />
                  <DetailRow label="Manufacturer" value={selectedProduct.manufacturer?.name || '-'} />
                  <DetailRow label="Country of Origin" value={selectedProduct.manufacturer?.country || selectedProduct.countryOfOrigin || 'India'} />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-secondary-400 uppercase tracking-wider">Stock & Pricing</h4>
                <div className="space-y-3">
                  <DetailRow label="Reorder Level" value={selectedProduct.reorderLevel} />
                  <DetailRow
                    label="Location"
                    value={selectedProduct.location
                      ? [selectedProduct.location.warehouse, selectedProduct.location.zone, selectedProduct.location.shelf, selectedProduct.location.rack, selectedProduct.location.bin].filter(Boolean).join(' → ') || '-'
                      : '-'
                    }
                  />
                  <DetailRow label="Tax Rate (GST)" value={`${selectedProduct.taxRate || 18}%`} />
                  <DetailRow label="Batch Number" value={selectedProduct.batchNumber || '-'} />
                  <DetailRow
                    label="Expiry Date"
                    value={selectedProduct.expiryDate ? new Date(selectedProduct.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-secondary-100 text-xs text-secondary-400">
              <span>Created {new Date(selectedProduct.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              <span>Last updated {new Date(selectedProduct.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={closeUpgradeModal}
        limitType={upgradeModal.limitType}
        currentUsage={upgradeModal.currentUsage}
        limit={upgradeModal.limit}
        feature={upgradeModal.feature}
      />
    </div>
  );
};

// Helper component for detail rows
const DetailRow = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-secondary-50 last:border-0">
    <span className="text-sm text-secondary-500">{label}</span>
    <span className="text-sm font-medium text-secondary text-right">{value}</span>
  </div>
);

export default Products;

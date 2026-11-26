import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Barcode,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  X,
  Check,
  Package,
  Calculator,
  Percent,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react';
import { productsAPI, customersAPI, invoicesAPI } from '../services/api';
import { Button, Input, Card, Badge, LoadingSpinner, Select } from '../components/ui';
import BarcodeScanner from '../components/BarcodeScanner';
import toast from 'react-hot-toast';

const POS = () => {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const barcodeInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart state
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [processing, setProcessing] = useState(false);

  // Discount state
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState(0);

  // Walk-in customer
  const [walkInCustomer, setWalkInCustomer] = useState({
    name: 'Walk-in Customer',
    phone: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    // Focus on barcode input on mount
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // Handle barcode scanner input (from keyboard wedge scanner)
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyPress = (e) => {
      const currentTime = Date.now();

      // If there's a long gap, reset buffer (scanner inputs are fast)
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter' && barcodeBuffer.length > 3) {
        handleBarcodeScan(barcodeBuffer);
        barcodeBuffer = '';
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [cart, products]);

  const fetchProducts = async () => {
    try {
      const { data } = await productsAPI.getAll({ limit: 500 });
      setProducts(data.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await customersAPI.getAll({ limit: 100 });
      setCustomers(data.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const handleBarcodeScan = useCallback((barcode) => {
    const product = products.find(
      (p) => p.sku === barcode || p.barcode === barcode
    );

    if (product) {
      addToCart(product);
      toast.success(`Added: ${product.name}`);
    } else {
      toast.error(`Product not found: ${barcode}`);
    }
  }, [products, cart]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        // Check stock
        if (existing.quantity >= product.quantity) {
          toast.error(`Only ${product.quantity} in stock`);
          return prev;
        }
        return prev.map((item) =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          rate: product.unitPrice || 0,
          originalRate: product.unitPrice || 0,
          taxRate: product.taxRate || 18,
        },
      ];
    });
  };

  const updateCartItem = (productId, field, value) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product._id === productId ? { ...item, [field]: value } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const incrementQuantity = (productId) => {
    const item = cart.find((i) => i.product._id === productId);
    if (item && item.quantity >= item.product.quantity) {
      toast.error(`Only ${item.product.quantity} in stock`);
      return;
    }
    updateCartItem(productId, 'quantity', (item?.quantity || 0) + 1);
  };

  const decrementQuantity = (productId) => {
    const item = cart.find((i) => i.product._id === productId);
    if (item && item.quantity > 1) {
      updateCartItem(productId, 'quantity', item.quantity - 1);
    } else {
      removeFromCart(productId);
    }
  };

  // Calculate totals
  const subtotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0
  );

  const discountAmount =
    discountType === 'percentage'
      ? (subtotal * discountValue) / 100
      : discountValue;

  const taxableAmount = subtotal - discountAmount;

  const totalTax = cart.reduce((sum, item) => {
    const itemTaxable = item.quantity * item.rate;
    return sum + (itemTaxable * item.taxRate) / 100;
  }, 0);

  const grandTotal = taxableAmount + totalTax;

  const changeAmount = parseFloat(amountReceived || 0) - grandTotal;

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.phone?.includes(customerSearch)
  );

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      setProcessing(true);

      // Prepare invoice data
      const invoiceData = {
        customer: selectedCustomer
          ? {
              name: selectedCustomer.name,
              email: selectedCustomer.email,
              phone: selectedCustomer.phone,
              gstNumber: selectedCustomer.gstNumber,
            }
          : {
              name: walkInCustomer.name,
              phone: walkInCustomer.phone,
            },
        billingAddress: selectedCustomer?.billingAddress || {},
        shippingAddress: selectedCustomer?.shippingAddress || {},
        items: cart.map((item) => ({
          product: item.product._id,
          quantity: item.quantity,
          rate: item.rate,
          taxRate: item.taxRate,
          description: item.product.description,
        })),
        discountType,
        discountValue,
        notes: 'POS Sale',
      };

      // Create invoice
      const { data: invoiceResponse } = await invoicesAPI.create(invoiceData);
      const invoice = invoiceResponse.data;

      // Immediately dispatch (deduct stock) and mark as paid
      await invoicesAPI.dispatch(invoice._id, {});
      await invoicesAPI.updateStatus(invoice._id, {
        status: 'paid',
        paymentMethod,
        paymentReference,
      });

      toast.success('Sale completed successfully!');

      // Clear cart and reset
      setCart([]);
      setSelectedCustomer(null);
      setDiscountValue(0);
      setAmountReceived('');
      setPaymentReference('');
      setShowPaymentModal(false);

      // Optionally navigate to invoice
      // navigate(`/invoices/${invoice._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete sale');
    } finally {
      setProcessing(false);
    }
  };

  const handleCameraScan = (barcode) => {
    setShowScanner(false);
    handleBarcodeScan(barcode);
  };

  const clearCart = () => {
    if (cart.length > 0 && window.confirm('Clear all items from cart?')) {
      setCart([]);
      setDiscountValue(0);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-8rem)]">
      {/* Left Panel - Products */}
      <div className="flex-1 min-w-0 min-h-[420px] flex flex-col bg-white rounded-xl border border-secondary-200 overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-secondary-100 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={searchInputRef}
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                placeholder="Search products by name or SKU..."
                icon={Search}
              />
              {showProductDropdown && productSearch && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg max-h-80 overflow-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-secondary-500">
                      No products found
                    </div>
                  ) : (
                    filteredProducts.slice(0, 15).map((product) => (
                      <div
                        key={product._id}
                        className="p-3 hover:bg-secondary-50 cursor-pointer flex justify-between items-center border-b border-secondary-50 last:border-0"
                        onClick={() => {
                          addToCart(product);
                          setProductSearch('');
                          setShowProductDropdown(false);
                        }}
                      >
                        <div>
                          <p className="font-medium text-secondary">
                            {product.name}
                          </p>
                          <p className="text-sm text-secondary-500">
                            SKU: {product.sku}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-primary">
                            ₹{product.unitPrice?.toLocaleString()}
                          </p>
                          <p
                            className={`text-sm ${
                              product.quantity <= product.reorderLevel
                                ? 'text-danger'
                                : 'text-secondary-500'
                            }`}
                          >
                            Stock: {product.quantity}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowScanner(true)}
              title="Scan Barcode"
            >
              <Barcode size={20} />
            </Button>
          </div>

          {/* Barcode Input */}
          <div className="flex gap-2 items-center">
            <Input
              ref={barcodeInputRef}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && barcodeInput) {
                  handleBarcodeScan(barcodeInput);
                  setBarcodeInput('');
                }
              }}
              placeholder="Scan or enter barcode..."
              className="font-mono"
            />
            <span className="text-xs text-secondary-400">Press Enter</span>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-secondary-400">
              <ShoppingCart size={64} className="mb-4 opacity-30" />
              <p className="text-lg">Cart is empty</p>
              <p className="text-sm mt-1">
                Scan or search for products to add
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.product._id} className="bg-secondary-50 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-secondary leading-snug">{item.product.name}</p>
                      <p className="text-xs text-secondary-500 mt-0.5">
                        SKU: {item.product.sku} • In stock: {Number(item.product.quantity).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product._id)}
                      className="p-1.5 rounded-md text-secondary-400 hover:text-danger hover:bg-danger-light transition-colors flex-shrink-0"
                      aria-label={`Remove ${item.product.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {/* Price */}
                    <label className="flex items-center gap-1.5 text-xs text-secondary-500">
                      Rate ₹
                      <input
                        type="number"
                        min="0"
                        value={item.rate}
                        onChange={(e) => updateCartItem(item.product._id, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-24 rounded-md border border-secondary-200 bg-white px-2 py-1.5 text-right text-sm text-secondary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </label>

                    {/* Quantity */}
                    <div className="flex items-center rounded-md border border-secondary-200 bg-white">
                      <button
                        type="button"
                        onClick={() => decrementQuantity(item.product._id)}
                        className="h-8 w-8 flex items-center justify-center text-secondary-500 hover:text-secondary hover:bg-secondary-50 rounded-l-md"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value) || 1;
                          if (qty > item.product.quantity) {
                            toast.error(`Only ${item.product.quantity} in stock`);
                            return;
                          }
                          updateCartItem(item.product._id, 'quantity', qty);
                        }}
                        className="w-14 h-8 border-x border-secondary-200 text-center text-sm text-secondary outline-none"
                        aria-label="Quantity"
                      />
                      <button
                        type="button"
                        onClick={() => incrementQuantity(item.product._id)}
                        className="h-8 w-8 flex items-center justify-center text-secondary-500 hover:text-secondary hover:bg-secondary-50 rounded-r-md"
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Line total */}
                    <div className="ml-auto text-right">
                      <p className="font-semibold text-secondary">
                        ₹{(item.quantity * item.rate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-secondary-500">+ GST {item.product.taxRate ?? 18}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-secondary-100 bg-secondary-50">
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={clearCart} className="text-danger">
                <Trash2 size={18} className="mr-2" />
                Clear Cart
              </Button>
              <div className="text-right">
                <p className="text-sm text-secondary-500">
                  {cart.length} items, {cart.reduce((s, i) => s + i.quantity, 0)} units
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Checkout */}
      <div className="w-full lg:w-96 flex-shrink-0 flex flex-col bg-white rounded-xl border border-secondary-200 overflow-hidden">
        {/* Customer Section */}
        <div className="p-4 border-b border-secondary-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-secondary-700">Customer</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomerModal(true)}
            >
              <User size={16} className="mr-1" />
              {selectedCustomer ? 'Change' : 'Select'}
            </Button>
          </div>
          {selectedCustomer ? (
            <div className="bg-primary-50 rounded-lg p-3">
              <p className="font-medium text-secondary">{selectedCustomer.name}</p>
              <p className="text-sm text-secondary-500">{selectedCustomer.phone}</p>
            </div>
          ) : (
            <div className="bg-secondary-50 rounded-lg p-3">
              <Input
                value={walkInCustomer.name}
                onChange={(e) =>
                  setWalkInCustomer((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Customer name"
                className="mb-2"
              />
              <Input
                value={walkInCustomer.phone}
                onChange={(e) =>
                  setWalkInCustomer((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="Phone (optional)"
              />
            </div>
          )}
        </div>

        {/* Discount Section */}
        <div className="p-4 border-b border-secondary-100">
          <div className="flex items-center gap-2">
            <Percent size={16} className="text-secondary-400" />
            <span className="text-sm font-medium text-secondary-700">Discount</span>
          </div>
          <div className="flex gap-2 mt-2">
            <Select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              className="w-28 flex-shrink-0"
              aria-label="Discount type"
            >
              <option value="percentage">% off</option>
              <option value="fixed">₹ off</option>
            </Select>
            <Input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
              min="0"
              placeholder="0"
            />
          </div>
        </div>

        {/* Totals Section */}
        <div className="flex-1 p-4 space-y-3">
          <div className="flex justify-between text-secondary-600">
            <span>Subtotal</span>
            <span>₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount</span>
              <span>-₹{discountAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between text-secondary-600">
            <span>Tax (GST)</span>
            <span>₹{totalTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="border-t border-secondary-200 pt-3 flex justify-between text-xl font-bold text-secondary">
            <span>Total</span>
            <span className="text-primary">₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Payment Buttons */}
        <div className="p-4 border-t border-secondary-100 space-y-3">
          <Button
            className="w-full h-14 text-lg"
            onClick={() => {
              if (cart.length === 0) {
                toast.error('Cart is empty');
                return;
              }
              setAmountReceived(grandTotal.toString());
              setShowPaymentModal(true);
            }}
            disabled={cart.length === 0}
          >
            <CreditCard size={24} className="mr-2" />
            Pay ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </Button>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPaymentMethod('cash');
                setAmountReceived(grandTotal.toString());
                setShowPaymentModal(true);
              }}
              disabled={cart.length === 0}
            >
              <Banknote size={18} className="mr-1" />
              Cash
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPaymentMethod('upi');
                setAmountReceived(grandTotal.toString());
                setShowPaymentModal(true);
              }}
              disabled={cart.length === 0}
            >
              <Smartphone size={18} className="mr-1" />
              UPI
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPaymentMethod('bank_transfer');
                setAmountReceived(grandTotal.toString());
                setShowPaymentModal(true);
              }}
              disabled={cart.length === 0}
            >
              <CreditCard size={18} className="mr-1" />
              Card
            </Button>
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary">
                Select Customer
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomerModal(false)}
              >
                <X size={20} />
              </Button>
            </div>

            <Input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search by name or phone..."
              icon={Search}
              className="mb-4"
            />

            <div className="flex-1 overflow-auto space-y-2">
              {/* Walk-in option */}
              <div
                className="p-3 rounded-lg border border-secondary-200 hover:bg-secondary-50 cursor-pointer"
                onClick={() => {
                  setSelectedCustomer(null);
                  setShowCustomerModal(false);
                }}
              >
                <p className="font-medium text-secondary">Walk-in Customer</p>
                <p className="text-sm text-secondary-500">No saved details</p>
              </div>

              {filteredCustomers.map((customer) => (
                <div
                  key={customer._id}
                  className="p-3 rounded-lg border border-secondary-200 hover:bg-secondary-50 cursor-pointer"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setShowCustomerModal(false);
                  }}
                >
                  <p className="font-medium text-secondary">{customer.name}</p>
                  <p className="text-sm text-secondary-500">
                    {customer.phone || customer.email}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-secondary">
                Complete Payment
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPaymentModal(false)}
              >
                <X size={20} />
              </Button>
            </div>

            <div className="text-center mb-6">
              <p className="text-sm text-secondary-500">Total Amount</p>
              <p className="text-4xl font-bold text-primary">
                ₹{grandTotal.toLocaleString()}
              </p>
            </div>

            {/* Payment Method Selection */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[
                { value: 'cash', icon: Banknote, label: 'Cash' },
                { value: 'upi', icon: Smartphone, label: 'UPI' },
                { value: 'bank_transfer', icon: CreditCard, label: 'Card' },
                { value: 'cheque', icon: Receipt, label: 'Cheque' },
              ].map((method) => (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-colors ${
                    paymentMethod === method.value
                      ? 'border-primary bg-primary-50 text-primary'
                      : 'border-secondary-200 text-secondary-600 hover:bg-secondary-50'
                  }`}
                >
                  <method.icon size={20} />
                  <span className="text-xs">{method.label}</span>
                </button>
              ))}
            </div>

            {/* Amount Received (for cash) */}
            {paymentMethod === 'cash' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Amount Received
                </label>
                <Input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="text-xl text-right font-medium"
                />
                {changeAmount > 0 && (
                  <div className="mt-2 p-3 bg-success-light rounded-lg">
                    <p className="text-sm text-success">
                      Change: <span className="font-bold">₹{changeAmount.toFixed(2)}</span>
                    </p>
                  </div>
                )}
                {changeAmount < 0 && (
                  <div className="mt-2 p-3 bg-danger-light rounded-lg">
                    <p className="text-sm text-danger flex items-center gap-1">
                      <AlertCircle size={14} />
                      Amount insufficient
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Payment Reference */}
            {paymentMethod !== 'cash' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Reference / Transaction ID
                </label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Enter transaction reference..."
                />
              </div>
            )}

            <Button
              className="w-full h-12 text-lg"
              onClick={handleCheckout}
              disabled={
                processing ||
                (paymentMethod === 'cash' && changeAmount < 0)
              }
            >
              {processing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Check size={20} className="mr-2" />
                  Complete Sale
                </>
              )}
            </Button>
          </Card>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary">
                Scan Barcode
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowScanner(false)}
              >
                <X size={20} />
              </Button>
            </div>
            <BarcodeScanner
              onScan={handleCameraScan}
              onError={(error) => toast.error(error)}
            />
          </Card>
        </div>
      )}
    </div>
  );
};

export default POS;

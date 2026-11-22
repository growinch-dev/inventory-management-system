import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  QrCode,
  Barcode,
  Printer,
  Package,
  Search,
  X,
  Plus,
  Minus,
  Download,
  Settings,
  Grid3X3,
  LayoutGrid,
} from 'lucide-react';
import { productsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Input,
  Select,
  LoadingSpinner,
  EmptyState,
} from '../components/ui';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { useLanguage } from '../context/LanguageContext';

const LabelGenerator = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searching, setSearching] = useState(false);
  const [initialProductLoaded, setInitialProductLoaded] = useState(false);

  // Label size presets
  const LABEL_SIZES = [
    { value: 'small', label: t('labels.small') + ' (38x25mm)', width: 38, height: 25 },
    { value: 'medium', label: t('labels.medium') + ' (50x30mm)', width: 50, height: 30 },
    { value: 'large', label: t('labels.large') + ' (100x50mm)', width: 100, height: 50 },
    { value: 'a4_sheet', label: t('labels.a4Sheet') + ' (30 labels)', width: 70, height: 37 },
  ];

  // Code types
  const CODE_TYPES = [
    { value: 'qrcode', label: t('labels.qrCode'), icon: QrCode },
    { value: 'barcode', label: t('labels.barcode'), icon: Barcode },
    { value: 'both', label: t('labels.both'), icon: Grid3X3 },
  ];
  const [generating, setGenerating] = useState(false);

  // Label settings
  const [codeType, setCodeType] = useState('qrcode');
  const [labelSize, setLabelSize] = useState('medium');
  const [showPrice, setShowPrice] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showName, setShowName] = useState(true);

  // Preview
  const [previewLabels, setPreviewLabels] = useState([]);
  const printRef = useRef(null);

  // Load product from URL query parameter
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && !initialProductLoaded) {
      loadProductById(productId);
    }
  }, [searchParams, initialProductLoaded]);

  const loadProductById = async (productId) => {
    try {
      const response = await productsAPI.getOne(productId);
      if (response.data?.data) {
        const product = response.data.data;
        // Check if product is not already added
        if (!selectedProducts.find(p => p._id === product._id)) {
          setSelectedProducts([{ ...product, labelQty: 4 }]);
        }
        setInitialProductLoaded(true);
      }
    } catch (error) {
      console.error('Failed to load product:', error);
      toast.error('Failed to load product');
    }
  };

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchProducts();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (selectedProducts.length > 0) {
      generatePreviews();
    } else {
      setPreviewLabels([]);
    }
  }, [selectedProducts, codeType, labelSize, showPrice, showSku, showName]);

  const searchProducts = async () => {
    try {
      setSearching(true);
      const response = await productsAPI.getAll({ search: searchTerm, limit: 20 });
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const addProduct = (product) => {
    if (selectedProducts.find(p => p._id === product._id)) {
      toast.error('Product already added');
      return;
    }
    setSelectedProducts([...selectedProducts, { ...product, labelQty: 4 }]);
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p._id !== productId));
  };

  const updateLabelQty = (productId, qty) => {
    setSelectedProducts(selectedProducts.map(p =>
      p._id === productId ? { ...p, labelQty: Math.max(1, qty) } : p
    ));
  };

  const generatePreviews = async () => {
    setGenerating(true);
    const labels = [];

    for (const product of selectedProducts) {
      for (let i = 0; i < product.labelQty; i++) {
        const label = {
          product,
          qrCode: null,
          barcode: null,
        };

        // Generate QR Code
        if (codeType === 'qrcode' || codeType === 'both') {
          const qrData = JSON.stringify({
            type: 'PRODUCT',
            id: product._id,
            sku: product.sku,
          });
          label.qrCode = await QRCode.toDataURL(qrData, {
            width: 150,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
          });
        }

        // Generate Barcode
        if (codeType === 'barcode' || codeType === 'both') {
          const canvas = document.createElement('canvas');
          JsBarcode(canvas, product.sku, {
            format: 'CODE128',
            width: 2,
            height: 40,
            displayValue: false,
            margin: 0,
          });
          label.barcode = canvas.toDataURL();
        }

        labels.push(label);
      }
    }

    setPreviewLabels(labels);
    setGenerating(false);
  };

  const handlePrint = () => {
    if (previewLabels.length === 0) {
      toast.error('No labels to print');
      return;
    }

    const printWindow = window.open('', '_blank');
    const sizeConfig = LABEL_SIZES.find(s => s.value === labelSize);

    const labelHtml = previewLabels.map((label) => `
      <div class="label" style="
        width: ${sizeConfig.width}mm;
        height: ${sizeConfig.height}mm;
        padding: 2mm;
        border: 1px dashed #ccc;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        page-break-inside: avoid;
        margin: 1mm;
        box-sizing: border-box;
        font-family: 'Arial', sans-serif;
      ">
        ${showName ? `<div style="font-size: ${sizeConfig.width < 50 ? '6pt' : '8pt'}; font-weight: bold; text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${label.product.name}</div>` : ''}

        <div style="display: flex; align-items: center; gap: 2mm; margin: 1mm 0;">
          ${label.qrCode ? `<img src="${label.qrCode}" style="width: ${sizeConfig.width < 50 ? '12mm' : '18mm'}; height: ${sizeConfig.width < 50 ? '12mm' : '18mm'};" />` : ''}
          ${label.barcode ? `<img src="${label.barcode}" style="width: ${sizeConfig.width < 50 ? '18mm' : '25mm'}; height: ${sizeConfig.width < 50 ? '8mm' : '12mm'};" />` : ''}
        </div>

        ${showSku ? `<div style="font-size: ${sizeConfig.width < 50 ? '5pt' : '7pt'}; font-family: monospace;">${label.product.sku}</div>` : ''}
        ${showPrice ? `<div style="font-size: ${sizeConfig.width < 50 ? '6pt' : '8pt'}; font-weight: bold;">₹${label.product.unitPrice?.toLocaleString('en-IN')}</div>` : ''}
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Labels</title>
        <style>
          @page {
            size: ${labelSize === 'a4_sheet' ? 'A4' : 'auto'};
            margin: 5mm;
          }
          body {
            margin: 0;
            padding: 5mm;
            display: flex;
            flex-wrap: wrap;
            align-content: flex-start;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .label { border: none !important; }
          }
        </style>
      </head>
      <body>
        ${labelHtml}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleDownloadPDF = async () => {
    if (previewLabels.length === 0) {
      toast.error('No labels to download');
      return;
    }

    try {
      const sizeConfig = LABEL_SIZES.find(s => s.value === labelSize);

      // Create PDF - A4 size
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Label dimensions
      const labelWidth = sizeConfig.width;
      const labelHeight = sizeConfig.height;
      const margin = 10;
      const gap = 5;

      // Calculate labels per row and center them
      const labelsPerRow = Math.floor((pageWidth - 2 * margin + gap) / (labelWidth + gap));
      const labelsPerCol = Math.floor((pageHeight - 2 * margin + gap) / (labelHeight + gap));
      const labelsPerPage = labelsPerRow * labelsPerCol;

      // Calculate starting X to center labels horizontally
      const totalRowWidth = labelsPerRow * labelWidth + (labelsPerRow - 1) * gap;
      const startX = (pageWidth - totalRowWidth) / 2;

      let currentLabel = 0;

      for (const label of previewLabels) {
        // Check if we need a new page
        if (currentLabel > 0 && currentLabel % labelsPerPage === 0) {
          pdf.addPage();
        }

        const positionOnPage = currentLabel % labelsPerPage;
        const row = Math.floor(positionOnPage / labelsPerRow);
        const col = positionOnPage % labelsPerRow;

        const x = startX + col * (labelWidth + gap);
        const y = margin + row * (labelHeight + gap);

        // Draw label border
        pdf.setDrawColor(180);
        pdf.setLineWidth(0.3);
        pdf.rect(x, y, labelWidth, labelHeight);

        // Calculate content heights to center vertically
        const isBoth = codeType === 'both';
        let contentHeight = 0;
        const nameHeight = showName ? 4 : 0;
        const qrSize = label.qrCode ? (isBoth ? 14 : 18) : 0;
        const barcodeHeight = label.barcode ? (isBoth ? 8 : 12) : 0;
        const skuHeight = showSku ? 3 : 0;
        const priceHeight = showPrice ? 4 : 0;
        const spacing = 2;

        contentHeight = nameHeight + qrSize + barcodeHeight + skuHeight + priceHeight;
        if (label.qrCode && label.barcode) contentHeight += spacing;
        if (showName) contentHeight += spacing;
        if (showSku) contentHeight += spacing;

        // Start Y position to center content vertically
        let yOffset = y + (labelHeight - contentHeight) / 2 + 3;

        // Product name
        if (showName) {
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          const maxChars = Math.floor(labelWidth / 2);
          const name = label.product.name.length > maxChars
            ? label.product.name.substring(0, maxChars) + '...'
            : label.product.name;
          pdf.text(name, x + labelWidth / 2, yOffset, { align: 'center' });
          yOffset += nameHeight + spacing;
        }

        // QR Code
        if (label.qrCode) {
          const size = isBoth ? 14 : 18;
          pdf.addImage(label.qrCode, 'PNG', x + (labelWidth - size) / 2, yOffset, size, size);
          yOffset += size + spacing;
        }

        // Barcode
        if (label.barcode) {
          const barcodeW = labelWidth * 0.7;
          const barcodeH = isBoth ? 8 : 12;
          pdf.addImage(label.barcode, 'PNG', x + (labelWidth - barcodeW) / 2, yOffset, barcodeW, barcodeH);
          yOffset += barcodeH + spacing;
        }

        // SKU
        if (showSku) {
          pdf.setFontSize(7);
          pdf.setFont('courier', 'normal');
          pdf.setTextColor(80, 80, 80);
          pdf.text(label.product.sku, x + labelWidth / 2, yOffset, { align: 'center' });
          yOffset += skuHeight + spacing;
        }

        // Price
        if (showPrice) {
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          const price = `Rs. ${label.product.unitPrice?.toLocaleString('en-IN') || 0}`;
          pdf.text(price, x + labelWidth / 2, yOffset, { align: 'center' });
        }

        currentLabel++;
      }

      // Download the PDF
      const productNames = selectedProducts.map(p => p.sku).join('_');
      pdf.save(`labels_${productNames}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF downloaded successfully');

    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const getTotalLabels = () => {
    return selectedProducts.reduce((sum, p) => sum + p.labelQty, 0);
  };

  const currentCodeType = CODE_TYPES.find(c => c.value === codeType);
  const CodeIcon = currentCodeType?.icon || QrCode;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={t('labels.title')}
        subtitle={t('labels.subtitle')}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm">
              <CodeIcon size={16} />
              {getTotalLabels()} {t('labels.labelQty').toLowerCase()}
            </div>
            <Button
              onClick={handlePrint}
              icon={Printer}
              disabled={previewLabels.length === 0}
            >
              {t('labels.printLabels')}
            </Button>
          </div>
        }
      />

      {/* Top Row - Settings and Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Code Type */}
        <Card padding="md">
          <Select
            label={t('labels.codeType')}
            value={codeType}
            onChange={(e) => setCodeType(e.target.value)}
            options={CODE_TYPES.map(c => ({ value: c.value, label: c.label }))}
          />
        </Card>

        {/* Label Size */}
        <Card padding="md">
          <Select
            label="Label Size"
            value={labelSize}
            onChange={(e) => setLabelSize(e.target.value)}
            options={LABEL_SIZES.map(s => ({ value: s.value, label: s.label }))}
          />
        </Card>

        {/* Include Options */}
        <Card padding="md" className="lg:col-span-2">
          <p className="text-sm font-medium text-secondary mb-3">Include on Label:</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showName}
                onChange={(e) => setShowName(e.target.checked)}
                className="w-4 h-4 rounded border-secondary-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-secondary">Product Name</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSku}
                onChange={(e) => setShowSku(e.target.checked)}
                className="w-4 h-4 rounded border-secondary-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-secondary">SKU Code</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                className="w-4 h-4 rounded border-secondary-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-secondary">Price</span>
            </label>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Product Selection */}
        <div className="space-y-6">
          {/* Search Products */}
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <Search size={18} className="text-primary" />
                Add Products
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="relative">
                <Input
                  placeholder="Search by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-3 max-h-64 overflow-y-auto border border-secondary-200 rounded-lg divide-y divide-secondary-100">
                  {searchResults.map((product) => (
                    <button
                      key={product._id}
                      onClick={() => addProduct(product)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-secondary-50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {product.qrCode ? (
                          <img src={product.qrCode} alt="" className="w-8 h-8 rounded" />
                        ) : (
                          <Package size={20} className="text-secondary-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-secondary truncate">{product.name}</p>
                        <p className="text-xs text-secondary-500 font-mono">{product.sku}</p>
                      </div>
                      <Plus size={18} className="text-primary flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {searchTerm.length >= 2 && searchResults.length === 0 && !searching && (
                <p className="text-sm text-secondary-500 text-center py-4">No products found</p>
              )}
            </Card.Content>
          </Card>

          {/* Selected Products */}
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <Package size={18} className="text-primary" />
                Selected Products
              </Card.Title>
              <Badge variant="default" size="sm">{selectedProducts.length}</Badge>
            </Card.Header>
            <Card.Content className="p-0">
              {selectedProducts.length > 0 ? (
                <ul className="divide-y divide-secondary-100 max-h-96 overflow-y-auto">
                  {selectedProducts.map((product) => (
                    <li key={product._id} className="p-4">
                      {/* Product Info Row */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {product.qrCode ? (
                            <img src={product.qrCode} alt="" className="w-8 h-8 rounded" />
                          ) : (
                            <Package size={20} className="text-secondary-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-secondary truncate">{product.name}</p>
                          <p className="text-xs text-secondary-500 font-mono">{product.sku}</p>
                          <p className="text-xs text-primary font-medium mt-0.5">₹{product.unitPrice?.toLocaleString('en-IN')}</p>
                        </div>
                        <button
                          onClick={() => removeProduct(product._id)}
                          className="w-7 h-7 rounded-lg bg-danger-light hover:bg-danger/20 text-danger flex items-center justify-center transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between bg-secondary-50 rounded-lg p-2">
                        <span className="text-xs text-secondary-500 ml-1">Label Qty:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateLabelQty(product._id, product.labelQty - 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-secondary-200 hover:bg-secondary-100 flex items-center justify-center transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            value={product.labelQty}
                            onChange={(e) => updateLabelQty(product._id, parseInt(e.target.value) || 1)}
                            className="w-12 text-center text-sm py-1 px-2 border border-secondary-200 rounded-lg bg-white"
                            min="1"
                          />
                          <button
                            onClick={() => updateLabelQty(product._id, product.labelQty + 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-secondary-200 hover:bg-secondary-100 flex items-center justify-center transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Package size={32} className="text-secondary-400" />
                  </div>
                  <p className="text-secondary-500 text-sm">Search and add products to generate labels</p>
                </div>
              )}
            </Card.Content>
          </Card>
        </div>

        {/* Right Column - Preview (larger) */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <LayoutGrid size={18} className="text-primary" />
                Label Preview
              </Card.Title>
              {previewLabels.length > 0 && (
                <Badge variant="success" size="sm">{previewLabels.length} labels ready</Badge>
              )}
            </Card.Header>
            <Card.Content>
              {generating ? (
                <LoadingSpinner.Container className="h-96" text="Generating labels..." />
              ) : previewLabels.length > 0 ? (
                <div
                  ref={printRef}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-secondary-50 rounded-xl min-h-96 max-h-[500px] overflow-y-auto"
                >
                  {previewLabels.map((label, index) => {
                    const isBoth = codeType === 'both';

                    return (
                      <div
                        key={index}
                        className="bg-white rounded-lg shadow-sm border border-secondary-200 p-4 flex flex-col items-center justify-center aspect-square"
                      >
                        {showName && (
                          <p className="text-xs font-semibold text-center truncate w-full mb-2">
                            {label.product.name}
                          </p>
                        )}

                        {/* Codes container - vertical layout for both, centered for single */}
                        <div className={`flex ${isBoth ? 'flex-col items-center gap-2' : 'items-center justify-center'} my-2`}>
                          {label.qrCode && (
                            <img
                              src={label.qrCode}
                              alt="QR Code"
                              className={isBoth ? 'w-12 h-12' : 'w-16 h-16'}
                            />
                          )}
                          {label.barcode && (
                            <img
                              src={label.barcode}
                              alt="Barcode"
                              className={isBoth ? 'h-8 max-w-full' : 'h-10 max-w-full'}
                            />
                          )}
                        </div>

                        {showSku && (
                          <p className="text-[10px] font-mono text-secondary-600 mt-1">{label.product.sku}</p>
                        )}
                        {showPrice && (
                          <p className="text-xs font-bold text-secondary">
                            ₹{label.product.unitPrice?.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={QrCode}
                  title="No labels to preview"
                  description="Add products and configure settings to generate label previews"
                  className="h-96"
                />
              )}
            </Card.Content>

            {previewLabels.length > 0 && (
              <div className="p-4 border-t border-secondary-100 flex items-center justify-between">
                <div className="text-sm text-secondary-500">
                  {getTotalLabels()} labels • {LABEL_SIZES.find(s => s.value === labelSize)?.label}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    icon={Download}
                    onClick={handleDownloadPDF}
                  >
                    Download PDF
                  </Button>
                  <Button
                    icon={Printer}
                    onClick={handlePrint}
                  >
                    Print All Labels
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LabelGenerator;

const QRCode = require('qrcode');

const generateQRCode = async (data) => {
  try {
    const qrData = JSON.stringify(data);
    const qrCode = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 200,
      margin: 2,
      color: {
        dark: '#1E293B',
        light: '#FFFFFF',
      },
    });
    return qrCode;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw error;
  }
};

const generateProductQRData = (product) => {
  return {
    type: 'PRODUCT',
    id: product._id.toString(),
    sku: product.sku,
    name: product.name,
    batch: product.batchNumber || 'N/A',
    mfgDate: product.manufacturingDate ? product.manufacturingDate.toISOString().split('T')[0] : 'N/A',
  };
};

module.exports = {
  generateQRCode,
  generateProductQRData,
};

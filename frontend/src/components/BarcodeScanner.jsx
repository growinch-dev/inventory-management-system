import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, Keyboard, ScanLine, RefreshCw } from 'lucide-react';
import { Button } from './ui';

// Native camera scanner using getUserMedia and BarcodeDetector API
const NativeCameraScanner = ({ selectedCamera, onScan, onError }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const detectorRef = useRef(null);

  const stopStream = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        // Check for BarcodeDetector support
        if ('BarcodeDetector' in window) {
          detectorRef.current = new window.BarcodeDetector({
            formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
          });
        } else {
          // Fallback: we'll use html5-qrcode but in a safer way
          const { Html5Qrcode } = await import('html5-qrcode');
          detectorRef.current = { type: 'html5-qrcode', Html5Qrcode };
        }

        const constraints = {
          video: {
            deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
            facingMode: selectedCamera ? undefined : 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          // Start scanning
          scanFrame();
        }
      } catch (err) {
        console.error('Camera error:', err);
        if (mounted) {
          onError(err.message || 'Could not access camera');
        }
      }
    };

    const scanFrame = async () => {
      if (!mounted || !videoRef.current || !detectorRef.current) return;

      try {
        if (detectorRef.current.detect) {
          // Native BarcodeDetector
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            if (navigator.vibrate) navigator.vibrate(200);
            stopStream();
            onScan(code.trim());
            return;
          }
        } else if (detectorRef.current.type === 'html5-qrcode') {
          // Fallback using canvas
          if (canvasRef.current && videoRef.current.readyState === 4) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0);

            try {
              const imageData = canvas.toDataURL('image/jpeg');
              const { Html5Qrcode } = detectorRef.current;
              const result = await Html5Qrcode.scanFile(
                await (await fetch(imageData)).blob(),
                false
              ).catch(() => null);

              if (result) {
                if (navigator.vibrate) navigator.vibrate(200);
                stopStream();
                onScan(result.trim());
                return;
              }
            } catch {
              // No barcode found, continue scanning
            }
          }
        }
      } catch {
        // Scanning error, continue
      }

      if (mounted) {
        animationRef.current = requestAnimationFrame(scanFrame);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      stopStream();
    };
  }, [selectedCamera, onScan, onError, stopStream]);

  return (
    <div className="relative w-full h-[220px] bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />
      {/* Scan overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-40 border-2 border-white/50 rounded-lg relative">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
          <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500/70 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

const BarcodeScanner = ({ onScan, onClose, isOpen }) => {
  const [mode, setMode] = useState('manual'); // 'camera' or 'manual'
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [cameraReady, setCameraReady] = useState(false);

  const manualInputRef = useRef(null);

  // Focus manual input when modal opens
  useEffect(() => {
    if (isOpen && mode === 'manual' && manualInputRef.current) {
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  }, [isOpen, mode]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setMode('manual');
      setManualCode('');
      setError('');
      setScanning(false);
    }
  }, [isOpen]);

  // Get cameras when switching to camera mode
  useEffect(() => {
    if (isOpen && mode === 'camera' && cameras.length === 0) {
      loadCameras();
    }
  }, [isOpen, mode, cameras.length]);

  const loadCameras = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        setCameras(devices);
        const backCamera = devices.find(
          (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
        );
        setSelectedCamera(backCamera?.id || devices[0].id);
        setCameraReady(true);
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
      setError('Could not access cameras. Please check permissions.');
    }
  };

  const startScanner = () => {
    if (!selectedCamera) {
      setError('No camera available');
      return;
    }
    setError('');
    setScanning(true);
  };

  const stopScanner = () => {
    setScanning(false);
  };

  const handleScanResult = (code) => {
    setScanning(false);
    onScan(code);
    setManualCode('');
  };

  const handleScanError = (message) => {
    setError('Failed to start camera. ' + message);
    setScanning(false);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && manualCode.trim()) {
      e.preventDefault();
      onScan(manualCode.trim());
      setManualCode('');
    }
  };

  const switchMode = (newMode) => {
    if (mode === 'camera') {
      stopScanner();
    }
    setMode(newMode);
    setError('');
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-secondary-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ScanLine size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary">Scan Barcode / QR</h3>
              <p className="text-xs text-secondary-500">Add product by scanning</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-secondary-100">
          <button
            onClick={() => switchMode('manual')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              mode === 'manual'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-secondary-500 hover:text-secondary-700'
            }`}
          >
            <Keyboard size={18} />
            Manual / External
          </button>
          <button
            onClick={() => switchMode('camera')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              mode === 'camera'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-secondary-500 hover:text-secondary-700'
            }`}
          >
            <Camera size={18} />
            Camera Scan
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {mode === 'manual' ? (
            <div>
              <p className="text-sm text-secondary-500 mb-4">
                Use an external barcode scanner or manually enter the product SKU/barcode.
              </p>
              <form onSubmit={handleManualSubmit}>
                <div className="relative">
                  <ScanLine size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400" />
                  <input
                    ref={manualInputRef}
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Scan or enter barcode/SKU..."
                    className="input pl-10 w-full text-lg font-mono"
                    autoComplete="off"
                  />
                </div>
                <Button type="submit" className="w-full mt-4" disabled={!manualCode.trim()}>
                  Add Product
                </Button>
              </form>
              <p className="text-xs text-secondary-400 text-center mt-4">
                External scanners auto-submit when they send Enter key
              </p>
            </div>
          ) : (
            <div>
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              {cameras.length > 1 && (
                <div className="mb-4">
                  <label className="text-sm text-secondary-600 mb-1 block">Select Camera</label>
                  <select
                    value={selectedCamera}
                    onChange={(e) => {
                      setSelectedCamera(e.target.value);
                      if (scanning) {
                        stopScanner();
                        setTimeout(startScanner, 200);
                      }
                    }}
                    className="select w-full"
                  >
                    {cameras.map((camera) => (
                      <option key={camera.id} value={camera.id}>
                        {camera.label || `Camera ${camera.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Scanner area */}
              <div className="rounded-lg overflow-hidden bg-black min-h-[220px] flex items-center justify-center">
                {scanning ? (
                  <NativeCameraScanner
                    selectedCamera={selectedCamera}
                    onScan={handleScanResult}
                    onError={handleScanError}
                  />
                ) : (
                  <div className="text-center text-white/70 p-4">
                    <Camera size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Click "Start Camera" to begin</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-4">
                {!scanning ? (
                  <Button
                    onClick={startScanner}
                    className="flex-1"
                    icon={Camera}
                    disabled={!cameraReady && cameras.length === 0}
                  >
                    {cameras.length === 0 ? 'Loading...' : 'Start Camera'}
                  </Button>
                ) : (
                  <>
                    <Button onClick={stopScanner} variant="secondary" className="flex-1" icon={X}>
                      Stop
                    </Button>
                    <Button
                      onClick={() => {
                        stopScanner();
                        setTimeout(startScanner, 200);
                      }}
                      variant="ghost"
                      icon={RefreshCw}
                    >
                      Restart
                    </Button>
                  </>
                )}
              </div>

              <p className="text-xs text-secondary-400 text-center mt-4">
                Position barcode in frame. It scans automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render in a portal to avoid React DOM conflicts
  return createPortal(modalContent, document.body);
};

export default BarcodeScanner;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {
  QrCode,
  Camera,
  Download,
  CheckCircle2,
  Sparkles,
  X,
  RefreshCw,
  AlertCircle,
  Upload,
  Video,
  VideoOff,
  ShieldCheck,
  Navigation,
  MapPin
} from 'lucide-react';
import { UserRole } from '../types';

export interface DumpsterQRPayload {
  binId: string;
  ward: string;
  address: string;
  lat: number;
  lng: number;
  capacityLitres: number;
  dumpsterType: string;
  installedDate?: string;
}

interface DumpsterQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyLocation: (payload: DumpsterQRPayload) => void;
  initialMode?: 'scan' | 'generate';
  userRole?: UserRole;
}

export const DumpsterQRModal: React.FC<DumpsterQRModalProps> = ({
  isOpen,
  onClose,
  onApplyLocation,
  initialMode = 'scan',
  userRole = 'citizen'
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'generate'>(initialMode);

  // Registered dumpsters fetched from DB
  const [registeredDumpsters, setRegisteredDumpsters] = useState<DumpsterQRPayload[]>([]);
  const [loadingDumpsters, setLoadingDumpsters] = useState(false);

  // Real camera & QR decoding state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const verifyingRef = useRef(false);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVerifyingQr, setIsVerifyingQr] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<DumpsterQRPayload | null>(null);
  const [manualBinInput, setManualBinInput] = useState('');

  // Generator & Admin Registration state
  const [customBinId, setCustomBinId] = useState('BIN-W12-08');
  const [customWard, setCustomWard] = useState('Ward 12 - Green Park');
  const [customAddress, setCustomAddress] = useState('Green Park High Street, Near Community Center');
  const [customLat, setCustomLat] = useState('13.0827');
  const [customLng, setCustomLng] = useState('80.2707');
  const [customCapacity, setCustomCapacity] = useState('1100');
  const [customType, setCustomType] = useState('Hydraulic Rear-Lift Dumpster');
  const [generatedQrDataUrl, setGeneratedQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegisteringBin, setIsRegisteringBin] = useState(false);
  const [isLocatingGenerator, setIsLocatingGenerator] = useState(false);
  const [registerFeedback, setRegisterFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setScanError(null);
      setScannedResult(null);
      setRegisterFeedback(null);
      fetchRegisteredDumpsters();
    } else {
      stopCamera();
    }
  }, [isOpen, initialMode]);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsStartingCamera(false);
  }, []);

  useEffect(() => {
    if (!isOpen || activeTab !== 'scan') {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, stopCamera]);

  const fetchRegisteredDumpsters = async () => {
    const token = localStorage.getItem('smartwaste_token');
    setLoadingDumpsters(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/dumpsters', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.dumpsters)) {
          setRegisteredDumpsters(data.dumpsters);
        }
      }
    } catch {
      // Leave list empty if server unreachable
    } finally {
      setLoadingDumpsters(false);
    }
  };

  const verifyQrWithBackend = async (qrRawText: string) => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setIsVerifyingQr(true);
    setScanError(null);
    setScannedResult(null);

    try {
      const token = localStorage.getItem('smartwaste_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/dumpsters/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({ qrData: qrRawText })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.dumpster) {
        setScanError(
          data.error ||
            'Invalid QR code: Only official Municipal Bin QR codes are supported. Other QR codes are rejected.'
        );
        return;
      }

      setScannedResult(data.dumpster);
      stopCamera();
      fetchRegisteredDumpsters();
    } catch {
      setScanError('Unable to reach server to verify QR code against municipal database.');
    } finally {
      setIsVerifyingQr(false);
      verifyingRef.current = false;
    }
  };

  const scanVideoFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });
        if (code && code.data && !verifyingRef.current) {
          verifyQrWithBackend(code.data);
          return;
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(scanVideoFrame);
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setScanError(null);
    setScannedResult(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Camera access is not supported in this browser or requires a secure HTTPS connection. Please upload a QR image or enter the Bin ID below.'
      );
      return;
    }

    setIsStartingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });

      streamRef.current = stream;
      setIsCameraActive(true);
      setIsStartingCamera(false);

      // Attach stream to video element on next tick
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          animFrameRef.current = requestAnimationFrame(scanVideoFrame);
        }
      });
    } catch (err: any) {
      setIsStartingCamera(false);
      setIsCameraActive(false);
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError(
          'Camera permission denied. Allow camera access in your browser settings or upload a QR sticker image below.'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError('No camera hardware detected on this device. Please upload a QR sticker image or enter Bin ID below.');
      } else {
        setCameraError(
          err?.message || 'Unable to start camera stream. Please upload a QR sticker image or enter Bin ID below.'
        );
      }
    }
  };

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setScanError(null);
    setScannedResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setScanError('Could not process uploaded QR image.');
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });

        if (!decoded || !decoded.data) {
          setScanError('No readable QR code found in the uploaded image. Please try a clearer QR sticker image.');
          return;
        }

        verifyQrWithBackend(decoded.data);
      };
      img.onerror = () => {
        setScanError('Uploaded file could not be read as an image.');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBinInput.trim()) {
      setScanError('Please enter a Dumpster Bin ID to verify.');
      return;
    }
    verifyQrWithBackend(manualBinInput.trim());
  };

  // Generate QR Code data URL when generator inputs change or modal opens
  useEffect(() => {
    if (isOpen && activeTab === 'generate') {
      generateCurrentQR();
    }
  }, [customBinId, customWard, customAddress, customLat, customLng, customCapacity, customType, activeTab, isOpen]);

  const buildGeneratorPayload = (): DumpsterQRPayload => ({
    binId: customBinId.trim().toUpperCase(),
    ward: customWard.trim() || 'Local Municipal Ward',
    address: customAddress.trim(),
    lat: Number.isFinite(parseFloat(customLat)) ? parseFloat(customLat) : 20.5937,
    lng: Number.isFinite(parseFloat(customLng)) ? parseFloat(customLng) : 78.9629,
    capacityLitres: parseInt(customCapacity, 10) || 1100,
    dumpsterType: customType,
    installedDate: new Date().toISOString().split('T')[0]
  });

  const handleUseGeneratorLiveGps = () => {
    if (!navigator.geolocation) {
      setRegisterFeedback({ text: 'Browser GPS is unavailable. Type your local Indian address and click Locate.', isError: true });
      return;
    }
    setIsLocatingGenerator(true);
    setRegisterFeedback(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCustomLat(lat.toFixed(6));
        setCustomLng(lng.toFixed(6));
        try {
          const res = await fetch(`/api/location/reverse?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data.address) setCustomAddress(data.address);
            if (data.wardSuggestion) setCustomWard(data.wardSuggestion);
          }
          setRegisterFeedback({ text: 'Live local Indian GPS & address filled into sticker!', isError: false });
        } catch {
          setRegisterFeedback({ text: 'Live GPS coordinates filled into sticker.', isError: false });
        } finally {
          setIsLocatingGenerator(false);
        }
      },
      () => {
        setIsLocatingGenerator(false);
        setRegisterFeedback({ text: 'GPS permission denied. Type your local address and click Locate Address.', isError: true });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleLookupGeneratorAddress = async () => {
    if (!customAddress.trim()) {
      setRegisterFeedback({ text: 'Please type a local Indian street, town, city or pincode first.', isError: true });
      return;
    }
    setIsLocatingGenerator(true);
    setRegisterFeedback(null);
    try {
      const res = await fetch(`/api/location/geocode?q=${encodeURIComponent(customAddress.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
        setCustomLat(Number(data.lat).toFixed(6));
        setCustomLng(Number(data.lng).toFixed(6));
        if (data.wardSuggestion) setCustomWard(data.wardSuggestion);
        setRegisterFeedback({ text: `Pinned local India coordinates (${Number(data.lat).toFixed(4)}, ${Number(data.lng).toFixed(4)})!`, isError: false });
      } else {
        setRegisterFeedback({ text: data.error || 'Could not locate that address on India map.', isError: true });
      }
    } catch {
      setRegisterFeedback({ text: 'Unable to reach address lookup service.', isError: true });
    } finally {
      setIsLocatingGenerator(false);
    }
  };

  const generateCurrentQR = async () => {
    setIsGenerating(true);
    const payload: DumpsterQRPayload = buildGeneratorPayload();

    try {
      const qrString = JSON.stringify(payload);
      const url = await QRCode.toDataURL(qrString, {
        width: 320,
        margin: 2,
        color: {
          dark: '#1e291e',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
      setGeneratedQrDataUrl(url);
    } catch (err) {
      console.error('QR Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegisterDumpsterInDb = async () => {
    setRegisterFeedback(null);
    const token = localStorage.getItem('smartwaste_token');
    setIsRegisteringBin(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/dumpsters', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          binId: customBinId.trim().toUpperCase(),
          ward: customWard,
          role: userRole,
          address: customAddress.trim(),
          lat: parseFloat(customLat),
          lng: parseFloat(customLng),
          capacityLitres: parseInt(customCapacity, 10) || 1100,
          dumpsterType: customType
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.dumpster) {
        setRegisterFeedback({
          text: data.error || 'Failed to register dumpster in database.',
          isError: true
        });
        return;
      }

      setRegisterFeedback({
        text: `Registered ${data.dumpster.binId} in MongoDB! Its QR sticker is now active for scanning.`,
        isError: false
      });
      await generateCurrentQR();
      await fetchRegisteredDumpsters();
    } catch {
      setRegisterFeedback({
        text: 'Network error while registering dumpster in database.',
        isError: true
      });
    } finally {
      setIsRegisteringBin(false);
    }
  };

  const handleApplyAndClose = (dumpster: DumpsterQRPayload) => {
    stopCamera();
    onApplyLocation(dumpster);
    onClose();
  };

  const handleDownloadQR = () => {
    if (!generatedQrDataUrl) return;
    const a = document.createElement('a');
    a.href = generatedQrDataUrl;
    a.download = `${customBinId.trim().toUpperCase() || 'DUMPSTER'}-QR-STICKER.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#2d3a2d]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#fdfcf9] border border-[#d9d4c1] rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">

        {/* Header */}
        <div className="bg-[#2d3a2d] text-[#fdfcf9] px-6 py-4 flex items-center justify-between border-b border-[#3a493a]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5d7a5c] flex items-center justify-center text-white shadow">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif italic text-lg font-bold text-[#fdfcf9]">
                Municipal Dumpster QR System
              </h3>
              <p className="text-[11px] text-[#cbd5c0]">
                Scan physical bin tags with camera or manage official municipal QR stickers
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-[#cbd5c0] hover:text-white hover:bg-[#3a493a] rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-[#d9d4c1] bg-[#f2f0e4] p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'scan'
                ? 'bg-[#5d7a5c] text-white shadow'
                : 'text-[#5d685c] hover:bg-white/60'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Scan Dumpster QR Sticker</span>
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'generate'
                ? 'bg-[#5d7a5c] text-white shadow'
                : 'text-[#5d685c] hover:bg-white/60'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Generate Physical QR Tag</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {activeTab === 'scan' ? (
            <div className="space-y-4">

              {/* Live Camera Scanner Viewfinder */}
              <div className="relative bg-[#1e261e] rounded-2xl p-4 sm:p-5 text-center border-2 border-[#5d7a5c]/60 overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[220px]">
                <canvas ref={canvasRef} className="hidden" />

                {isCameraActive ? (
                  <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border-2 border-emerald-400/80 bg-black">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-56 object-cover"
                    />
                    <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse pointer-events-none" />
                    <div className="absolute bottom-2 inset-x-0 flex justify-center">
                      <span className="bg-black/70 text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-full">
                        {isVerifyingQr ? 'Verifying QR in database...' : 'Point camera at Dumpster QR Sticker'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-48 h-40 border-2 border-dashed border-emerald-400/80 rounded-2xl flex flex-col items-center justify-center p-3 bg-black/30">
                    {isVerifyingQr || isStartingCamera ? (
                      <div className="flex flex-col items-center gap-2 text-emerald-400 text-xs font-bold">
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span>{isStartingCamera ? 'Requesting Camera...' : 'Verifying QR in Database...'}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[#cbd5c0] text-xs">
                        <QrCode className="w-9 h-9 text-emerald-400/90" />
                        <span className="font-semibold text-white text-[11px]">Real Optical QR Scanner</span>
                        <span className="text-[10px] text-emerald-300/80">Uses device camera or QR PNG</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-400"></div>
                    <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-400"></div>
                    <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-400"></div>
                    <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-400"></div>
                  </div>
                )}

                {/* Scanner Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  {!isCameraActive ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={isStartingCamera}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>{isStartingCamera ? 'Starting Camera...' : 'Start Live Camera Scan'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <VideoOff className="w-3.5 h-3.5" />
                      <span>Stop Camera</span>
                    </button>
                  )}

                  <label className="bg-[#2d3a2d] hover:bg-[#3a493a] text-[#fdfcf9] border border-[#5d7a5c] font-bold px-4 py-2 rounded-xl text-xs transition shadow flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Scan QR Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleQrImageUpload}
                    />
                  </label>
                </div>

                {cameraError && (
                  <div className="mt-3 w-full bg-amber-950/80 border border-amber-500/60 text-amber-200 rounded-xl px-3 py-2 text-[11px] flex items-center gap-2 text-left">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}
              </div>

              {/* Manual Bin ID Verification Alternative */}
              <form onSubmit={handleManualVerify} className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualBinInput}
                  onChange={(e) => setManualBinInput(e.target.value)}
                  placeholder="Or enter printed Bin ID (e.g. BIN-W12-04)"
                  className="flex-1 bg-white border border-[#d9d4c1] rounded-xl px-3.5 py-2 text-xs font-mono text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                />
                <button
                  type="submit"
                  disabled={isVerifyingQr}
                  className="bg-[#2d3a2d] hover:bg-[#1e261e] text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Verify Bin ID
                </button>
              </form>

              {/* Rejection / Verification Error Banner */}
              {scanError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3.5 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{scanError}</span>
                </div>
              )}

              {/* Verified Scanned Dumpster Result Card */}
              {scannedResult && (
                <div className="bg-[#f0f4ef] border border-[#5d7a5c] rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#5d7a5c] text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif italic font-bold text-sm text-[#2d3a2d]">
                            Dumpster Verified: {scannedResult.binId}
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.2 rounded-full">
                            DB Validated
                          </span>
                        </div>
                        <p className="text-xs text-[#5d685c] mt-0.5">
                          {scannedResult.address}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#5d7a5c]/20 text-[11px]">
                    <div className="bg-white p-2 rounded-xl border border-[#d9d4c1]">
                      <span className="text-[#7a8a7a] text-[9px] uppercase font-bold block">Ward</span>
                      <strong className="text-[#2d3a2d] truncate block">{scannedResult.ward}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-[#d9d4c1]">
                      <span className="text-[#7a8a7a] text-[9px] uppercase font-bold block">GPS Coords</span>
                      <strong className="text-[#2d3a2d] font-mono text-[10px] block">
                        {scannedResult.lat.toFixed(4)}, {scannedResult.lng.toFixed(4)}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-[#d9d4c1]">
                      <span className="text-[#7a8a7a] text-[9px] uppercase font-bold block">Bin Type</span>
                      <strong className="text-[#2d3a2d] text-[10px] truncate block">{scannedResult.dumpsterType}</strong>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleApplyAndClose(scannedResult)}
                      className="flex-1 bg-[#5d7a5c] hover:bg-[#4d664c] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Auto-Fill Location into Complaint Form</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Registered Municipal Dumpsters Reference List (read-only from DB) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a]">
                    Registered Municipal Dumpsters ({registeredDumpsters.length})
                  </label>
                  {loadingDumpsters && <span className="text-[10px] text-[#7a8a7a]">Loading...</span>}
                </div>
                {registeredDumpsters.length === 0 ? (
                  <p className="text-xs text-[#7a8a7a] bg-white border border-[#d9d4c1] rounded-xl p-3">
                    No registered dumpsters loaded from database.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {registeredDumpsters.slice(0, 6).map((bin) => (
                      <div
                        key={bin.binId}
                        className="text-left p-2.5 rounded-2xl border bg-white border-[#d9d4c1] flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[11px] font-bold bg-[#2d3a2d] text-white px-2 py-0.5 rounded-lg">
                            {bin.binId}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {bin.capacityLitres}L Bin
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-[#2d3a2d] truncate">{bin.address}</p>
                        <div className="flex items-center justify-between text-[10px] text-[#7a8a7a] mt-1 pt-1 border-t border-[#f0eee4]">
                          <span>{bin.ward}</span>
                          <span className="font-mono">{bin.lat.toFixed(4)}°N, {bin.lng.toFixed(4)}°E</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* Tab: Generate Physical Dumpster QR Sticker */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

              {/* Form Inputs for Custom Dumpster */}
              <div className="space-y-3.5">
                {userRole !== 'admin' && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-2.5 text-[11px] flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                    <span>
                      Admin login is required to register new official bins in the database. You can preview stickers or download registered bin tags.
                    </span>
                  </div>
                )}

                {registerFeedback && (
                  <div
                    className={`rounded-xl p-2.5 text-xs flex items-start gap-2 ${
                      registerFeedback.isError
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    }`}
                  >
                    {registerFeedback.isError ? (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{registerFeedback.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a] mb-1">
                    Dumpster Tag / Bin ID
                  </label>
                  <input
                    type="text"
                    value={customBinId}
                    onChange={(e) => setCustomBinId(e.target.value)}
                    placeholder="e.g. BIN-W12-08"
                    className="w-full bg-white border border-[#d9d4c1] rounded-xl px-3.5 py-2 text-xs font-mono text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a] mb-1">
                    Municipal Ward / Local Area
                  </label>
                  <input
                    type="text"
                    list="qr-ward-presets"
                    value={customWard}
                    onChange={(e) => setCustomWard(e.target.value)}
                    placeholder="Enter your local area, ward, town or city"
                    className="w-full bg-white border border-[#d9d4c1] rounded-xl px-3.5 py-2 text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                  />
                  <datalist id="qr-ward-presets">
                    <option value="Ward 12 - Green Park" />
                    <option value="Ward 08 - Market Road" />
                    <option value="Ward 04 - Railway Station" />
                    <option value="Ward 02 - Central Market" />
                  </datalist>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a]">
                      Street Address / Local Landmark
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleLookupGeneratorAddress}
                        disabled={isLocatingGenerator}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f2f0e4] hover:bg-[#e5e1cc] text-[#2d3a2d] border border-[#d9d4c1] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <MapPin className="w-3 h-3 text-[#5d7a5c]" />
                        <span>Locate</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleUseGeneratorLiveGps}
                        disabled={isLocatingGenerator}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5d7a5c] hover:bg-[#4d664c] text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Navigation className={`w-3 h-3 ${isLocatingGenerator ? 'animate-spin' : ''}`} />
                        <span>Live GPS</span>
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    placeholder="Your local street, area, town/city, India"
                    className="w-full bg-white border border-[#d9d4c1] rounded-xl px-3.5 py-2 text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a] mb-1">
                      Latitude
                    </label>
                    <input
                      type="text"
                      value={customLat}
                      onChange={(e) => setCustomLat(e.target.value)}
                      className="w-full bg-white border border-[#d9d4c1] rounded-xl px-3 py-1.5 text-xs font-mono text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a] mb-1">
                      Longitude
                    </label>
                    <input
                      type="text"
                      value={customLng}
                      onChange={(e) => setCustomLng(e.target.value)}
                      className="w-full bg-white border border-[#d9d4c1] rounded-xl px-3 py-1.5 text-xs font-mono text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a] mb-1">
                      Capacity (Litres)
                    </label>
                    <input
                      type="number"
                      value={customCapacity}
                      onChange={(e) => setCustomCapacity(e.target.value)}
                      className="w-full bg-white border border-[#d9d4c1] rounded-xl px-3 py-1.5 text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a] mb-1">
                      Dumpster Type
                    </label>
                    <select
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      className="w-full bg-white border border-[#d9d4c1] rounded-xl px-2 py-1.5 text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                    >
                      <option value="Hydraulic Rear-Lift Dumpster">Hydraulic Rear-Lift</option>
                      <option value="Dual-Compartment Segregated Bin">Dual Segregated</option>
                      <option value="Heavy-Duty Metal Compactor Bin">Heavy Compactor</option>
                      <option value="Large Roll-On Roll-Off Bin">Roll-On Roll-Off</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Physical Sticker Live Preview */}
              <div className="flex flex-col items-center">
                <div className="w-full bg-white border-2 border-[#2d3a2d] rounded-3xl p-5 shadow-lg flex flex-col items-center text-center space-y-3">
                  <div className="w-full border-b-2 border-[#2d3a2d] pb-2 flex items-center justify-between">
                    <span className="font-serif italic font-black text-xs text-[#2d3a2d] uppercase tracking-wider">
                      Municipal Sanitation Dept.
                    </span>
                    <span className="bg-[#2d3a2d] text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                      {customBinId.toUpperCase()}
                    </span>
                  </div>

                  <div className="bg-[#fdfcf9] p-2 rounded-2xl border border-[#d9d4c1] shadow-inner">
                    {generatedQrDataUrl && !isGenerating ? (
                      <img
                        src={generatedQrDataUrl}
                        alt="Dumpster QR Tag"
                        className="w-44 h-44 object-contain"
                      />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-xs text-[#7a8a7a]">
                        Generating QR Code...
                      </div>
                    )}
                  </div>

                  <div className="w-full text-center space-y-0.5">
                    <strong className="block text-[11px] text-[#2d3a2d] font-bold">
                      SCAN TO REPORT OVERFLOW OR DAMAGE
                    </strong>
                    <p className="text-[10px] text-[#5d685c] truncate">
                      {customAddress}
                    </p>
                    <span className="text-[9px] text-[#7a8a7a] font-mono block">
                      {customWard} • {customCapacity}L • GPS: {(parseFloat(customLat) || 0).toFixed(4)}, {(parseFloat(customLng) || 0).toFixed(4)}
                    </span>
                  </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="bg-[#2d3a2d] hover:bg-[#1e261e] text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </button>

                  {userRole === 'admin' ? (
                    <button
                      type="button"
                      onClick={handleRegisterDumpsterInDb}
                      disabled={isRegisteringBin}
                      className="bg-[#5d7a5c] hover:bg-[#4d664c] text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{isRegisteringBin ? 'Saving Bin...' : 'Register Bin in DB'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('scan');
                        verifyQrWithBackend(JSON.stringify(buildGeneratorPayload()));
                      }}
                      className="bg-[#5d7a5c] hover:bg-[#4d664c] text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Verify Bin QR</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, Camera, Download, CheckCircle2, MapPin, Trash2, Sparkles, X, ExternalLink, RefreshCw, Printer } from 'lucide-react';

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

export const PRESET_DUMPSTERS: DumpsterQRPayload[] = [
  {
    binId: 'BIN-W12-04',
    ward: 'Ward 12 - Green Park',
    address: 'Green Park Avenue, Gate 2 (Commercial Market Bin #04)',
    lat: 18.5235,
    lng: 73.8542,
    capacityLitres: 1100,
    dumpsterType: 'Hydraulic Rear-Lift Dumpster',
    installedDate: '2025-03-15'
  },
  {
    binId: 'BIN-W08-02',
    ward: 'Ward 08 - Market Road',
    address: 'Market Road Commercial Transit Hub, Gate 3 (Bin #02)',
    lat: 18.5312,
    lng: 73.8491,
    capacityLitres: 1200,
    dumpsterType: 'Dual-Compartment Segregated Bin',
    installedDate: '2025-05-10'
  },
  {
    binId: 'BIN-W04-07',
    ward: 'Ward 04 - Railway Station',
    address: 'Railway Station South Exit & Auto Stand (Bin #07)',
    lat: 18.5289,
    lng: 73.8744,
    capacityLitres: 1500,
    dumpsterType: 'Heavy-Duty Metal Compactor Bin',
    installedDate: '2024-11-20'
  },
  {
    binId: 'BIN-W02-09',
    ward: 'Ward 02 - Central Market',
    address: 'Central Market Vegetable & Fruit Plaza (Bin #09)',
    lat: 18.5165,
    lng: 73.8560,
    capacityLitres: 2400,
    dumpsterType: 'Large Roll-On Roll-Off Bin',
    installedDate: '2025-01-18'
  }
];

interface DumpsterQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyLocation: (payload: DumpsterQRPayload) => void;
  initialMode?: 'scan' | 'generate';
}

export const DumpsterQRModal: React.FC<DumpsterQRModalProps> = ({
  isOpen,
  onClose,
  onApplyLocation,
  initialMode = 'scan'
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'generate'>(initialMode);

  // Scan state
  const [selectedDumpster, setSelectedDumpster] = useState<DumpsterQRPayload>(PRESET_DUMPSTERS[0]);
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);
  const [scannedResult, setScannedResult] = useState<DumpsterQRPayload | null>(null);

  // Generator state
  const [customBinId, setCustomBinId] = useState('BIN-W12-08');
  const [customWard, setCustomWard] = useState('Ward 12 - Green Park');
  const [customAddress, setCustomAddress] = useState('Green Park High Street, Near Community Center');
  const [customLat, setCustomLat] = useState('18.5248');
  const [customLng, setCustomLng] = useState('73.8555');
  const [customCapacity, setCustomCapacity] = useState('1100');
  const [customType, setCustomType] = useState('Hydraulic Rear-Lift Dumpster');
  const [generatedQrDataUrl, setGeneratedQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate QR Code data URL when generator inputs change or modal opens
  useEffect(() => {
    generateCurrentQR();
  }, [customBinId, customWard, customAddress, customLat, customLng, customCapacity, customType, activeTab]);

  const generateCurrentQR = async () => {
    setIsGenerating(true);
    const payload: DumpsterQRPayload = {
      binId: customBinId.trim().toUpperCase(),
      ward: customWard,
      address: customAddress.trim(),
      lat: parseFloat(customLat) || 18.5204,
      lng: parseFloat(customLng) || 73.8567,
      capacityLitres: parseInt(customCapacity, 10) || 1100,
      dumpsterType: customType,
      installedDate: new Date().toISOString().split('T')[0]
    };

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

  const handleSimulateScan = (dumpster: DumpsterQRPayload) => {
    setSelectedDumpster(dumpster);
    setIsSimulatingScan(true);
    setTimeout(() => {
      setIsSimulatingScan(false);
      setScannedResult(dumpster);
    }, 700);
  };

  const handleApplyAndClose = (dumpster: DumpsterQRPayload) => {
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
      <div className="bg-[#fdfcf9] border border-[#d9d4c1] rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
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
                Scan physical bin tags or generate official municipal stickers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
        <div className="p-6">
          {activeTab === 'scan' ? (
            <div className="space-y-5">
              
              {/* Camera Scanner Simulation Viewfinder */}
              <div className="relative bg-[#1e261e] rounded-2xl p-6 text-center border-2 border-[#5d7a5c]/60 overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[180px]">
                {/* Visual Viewfinder Reticle */}
                <div className="relative w-48 h-48 border-2 border-dashed border-emerald-400/80 rounded-2xl flex flex-col items-center justify-center p-3 bg-black/30">
                  {/* Scanning Laser Animation */}
                  <div className="absolute inset-x-2 top-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-bounce"></div>
                  
                  {isSimulatingScan ? (
                    <div className="flex flex-col items-center gap-2 text-emerald-400 text-xs font-bold">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                      <span>Decoding Dumpster Payload...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#cbd5c0] text-xs">
                      <QrCode className="w-10 h-10 text-emerald-400/90" />
                      <span className="font-semibold text-white text-[11px]">Align Dumpster QR in Frame</span>
                      <span className="text-[10px] text-emerald-300/80">Optical decoder ready</span>
                    </div>
                  )}

                  {/* Corner Targets */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-400"></div>
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-400"></div>
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-400"></div>
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-400"></div>
                </div>

                <p className="text-[11px] text-[#cbd5c0] mt-3 max-w-sm">
                  Simulate scanning any of the registered physical municipal dumpsters below to pre-fill complaint GPS coordinates & street address:
                </p>
              </div>

              {/* Physical Dumpsters Roster */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a] mb-2">
                  Select Physical Dumpster Tag to Scan:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESET_DUMPSTERS.map((bin) => {
                    const isSelected = selectedDumpster.binId === bin.binId;
                    return (
                      <button
                        key={bin.binId}
                        onClick={() => handleSimulateScan(bin)}
                        className={`text-left p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#f0f4ef] border-[#5d7a5c] shadow-sm'
                            : 'bg-white border-[#d9d4c1] hover:border-[#5d7a5c]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-bold bg-[#2d3a2d] text-white px-2 py-0.5 rounded-lg">
                            {bin.binId}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {bin.capacityLitres}L Bin
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[#2d3a2d] truncate">
                          {bin.address}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-[#7a8a7a] mt-1 pt-1 border-t border-[#f0eee4]">
                          <span>{bin.ward}</span>
                          <span className="font-mono">{bin.lat.toFixed(4)}°N, {bin.lng.toFixed(4)}°E</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scanned Dumpster Result Card */}
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
                            QR Validated
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

            </div>
          ) : (
            /* Tab: Generate Physical Dumpster QR Sticker */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* Form Inputs for Custom Dumpster */}
              <div className="space-y-3.5">
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
                    Municipal Ward
                  </label>
                  <select
                    value={customWard}
                    onChange={(e) => setCustomWard(e.target.value)}
                    className="w-full bg-white border border-[#d9d4c1] rounded-xl px-3.5 py-2 text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                  >
                    <option value="Ward 12 - Green Park">Ward 12 - Green Park</option>
                    <option value="Ward 08 - Market Road">Ward 08 - Market Road</option>
                    <option value="Ward 04 - Railway Station">Ward 04 - Railway Station</option>
                    <option value="Ward 02 - Central Market">Ward 02 - Central Market</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a] mb-1">
                    Street Address / Dumpster Location
                  </label>
                  <input
                    type="text"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    placeholder="Physical placement landmark"
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
                      <option value="Dual Segregated Bin">Dual Segregated</option>
                      <option value="Heavy Metal Compactor">Heavy Compactor</option>
                      <option value="Roll-On Roll-Off Bin">Roll-On Roll-Off</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Physical Sticker Live Preview */}
              <div className="flex flex-col items-center">
                <div className="w-full bg-white border-2 border-[#2d3a2d] rounded-3xl p-5 shadow-lg flex flex-col items-center text-center space-y-3">
                  {/* Municipal Branding Header on Sticker */}
                  <div className="w-full border-b-2 border-[#2d3a2d] pb-2 flex items-center justify-between">
                    <span className="font-serif italic font-black text-xs text-[#2d3a2d] uppercase tracking-wider">
                      Municipal Sanitation Dept.
                    </span>
                    <span className="bg-[#2d3a2d] text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                      {customBinId.toUpperCase()}
                    </span>
                  </div>

                  {/* QR Code Graphic */}
                  <div className="bg-[#fdfcf9] p-2 rounded-2xl border border-[#d9d4c1] shadow-inner">
                    {generatedQrDataUrl ? (
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

                  {/* Sticker Instructions */}
                  <div className="w-full text-center space-y-0.5">
                    <strong className="block text-[11px] text-[#2d3a2d] font-bold">
                      SCAN TO REPORT OVERFLOW OR DAMAGE
                    </strong>
                    <p className="text-[10px] text-[#5d685c] truncate">
                      {customAddress}
                    </p>
                    <span className="text-[9px] text-[#7a8a7a] font-mono block">
                      {customWard} • {customCapacity}L • GPS: {parseFloat(customLat).toFixed(4)}, {parseFloat(customLng).toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Download and Test Action Buttons */}
                <div className="w-full grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={handleDownloadQR}
                    className="bg-[#2d3a2d] hover:bg-[#1e261e] text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </button>

                  <button
                    onClick={() => {
                      const payload: DumpsterQRPayload = {
                        binId: customBinId.trim().toUpperCase(),
                        ward: customWard,
                        address: customAddress.trim(),
                        lat: parseFloat(customLat) || 18.5204,
                        lng: parseFloat(customLng) || 73.8567,
                        capacityLitres: parseInt(customCapacity, 10) || 1100,
                        dumpsterType: customType
                      };
                      handleApplyAndClose(payload);
                    }}
                    className="bg-[#5d7a5c] hover:bg-[#4d664c] text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Test Auto-Fill</span>
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

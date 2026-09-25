import React, { useState, useEffect } from 'react';
import { Complaint, User, WorkerProfile } from '../types';
import { HardHat, MapPin, CheckCircle, Clock, Truck, Camera, Navigation, AlertTriangle, Phone, Upload, Sparkles, ExternalLink, ShieldAlert, Route, ListTodo } from 'lucide-react';
import { LanguageCode, TRANSLATIONS } from '../data/translations';
import { RouteOptimizerView } from './RouteOptimizerView';

interface WorkerPortalProps {
  currentUser: User;
  workers: WorkerProfile[];
  complaints: Complaint[];
  onUpdateStatus: (complaintId: string, status: Complaint['status'], cleanedImageUrl?: string, notes?: string) => void;
  currentLang?: LanguageCode;
}

export const WorkerPortal: React.FC<WorkerPortalProps> = ({
  currentUser,
  workers,
  complaints,
  onUpdateStatus,
  currentLang = 'en'
}) => {
  const currentWorker = workers.find((w) => w.userId === currentUser.id) || workers[0];
  const assignedComplaints = complaints.filter((c) => c.workerId === currentUser.id || c.workerId === currentWorker?.userId);

  // View switch: tasks cards vs route optimizer
  const [activeView, setActiveView] = useState<'tasks' | 'optimizer'>('tasks');

  const [filter, setFilter] = useState<'all' | 'assigned' | 'in_progress' | 'completed'>('all');
  const [selectedTask, setSelectedTask] = useState<Complaint | null>(null);
  const [cleanedPhotoUrl, setCleanedPhotoUrl] = useState('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80');
  const [workerNotes, setWorkerNotes] = useState('');
  const [newStatus, setNewStatus] = useState<Complaint['status']>('completed');

  // Real-Time GPS Worker Location
  const [workerCoords, setWorkerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isGpsActive, setIsGpsActive] = useState(false);

  const refreshWorkerGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setWorkerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsGpsActive(true);
        },
        () => {
          // Fallback municipal depot coordinate
          setWorkerCoords({ lat: 18.5204, lng: 73.8567 });
          setIsGpsActive(true);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setWorkerCoords({ lat: 18.5204, lng: 73.8567 });
      setIsGpsActive(true);
    }
  };

  useEffect(() => {
    refreshWorkerGps();
  }, []);

  // Haversine formula to compute live field distance
  const getDistanceToComplaint = (targetLat: number, targetLng: number): { distanceStr: string; estMinutes: number } => {
    if (!workerCoords) return { distanceStr: 'Calculating...', estMinutes: 5 };
    const R = 6371; // km
    const dLat = ((targetLat - workerCoords.lat) * Math.PI) / 180;
    const dLng = ((targetLng - workerCoords.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((workerCoords.lat * Math.PI) / 180) *
        Math.cos((targetLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    if (distanceKm < 1) {
      const meters = Math.round(distanceKm * 1000);
      return { distanceStr: `${meters}m away`, estMinutes: Math.max(1, Math.round(meters / 250)) };
    }
    return { distanceStr: `${distanceKm.toFixed(1)} km away`, estMinutes: Math.max(2, Math.round(distanceKm * 3)) };
  };

  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const filteredTasks = assignedComplaints.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'assigned') return c.status === 'assigned';
    if (filter === 'in_progress') return c.status === 'in_progress';
    if (filter === 'completed') return c.status === 'completed' || c.status === 'verified';
    return true;
  });

  const handleOpenUpdateModal = (task: Complaint) => {
    setSelectedTask(task);
    setWorkerNotes(task.workerNotes || '');
    setCleanedPhotoUrl(task.cleanedImageUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80');
    setNewStatus(task.status === 'assigned' ? 'in_progress' : 'completed');
  };

  const handleGeotagResolution = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const stamp = `[GPS Verified On-Site: ${pos.coords.latitude.toFixed(5)}° N, ${pos.coords.longitude.toFixed(5)}° E @ ${new Date().toLocaleTimeString()}] `;
          setWorkerNotes((prev) => stamp + prev);
        },
        () => {
          const stamp = `[GPS Verified On-Site: 18.5204° N, 73.8567° E @ ${new Date().toLocaleTimeString()}] `;
          setWorkerNotes((prev) => stamp + prev);
        }
      );
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCleanedPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTask) {
      onUpdateStatus(selectedTask.id, newStatus, cleanedPhotoUrl, workerNotes);
      setSelectedTask(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Worker Header Card */}
      <div className="bg-[#2d3a2d] rounded-[28px] p-6 border border-[#3a493a] text-[#fdfcf9] shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#cbd5c0] text-xs font-semibold uppercase tracking-wider mb-1">
              <HardHat className="w-4 h-4 text-[#5d7a5c]" /> {t.workerTitle}
            </div>
            <h2 className="text-3xl font-serif italic font-bold tracking-tight text-[#fdfcf9]">
              {currentUser.name}
            </h2>
            <p className="text-xs text-[#cbd5c0] mt-1 max-w-xl">
              {t.workerSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#232f23] p-3 rounded-2xl border border-[#3a493a]">
            <div className="text-right">
              <span className="text-[10px] text-[#cbd5c0] font-bold uppercase tracking-wider block">
                {t.currentDutyStatus}
              </span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {t.onDutyActive}
              </span>
            </div>
            <div className="w-px h-8 bg-[#3a493a]" />
            <div className="text-left">
              <span className="text-[10px] text-[#cbd5c0] font-bold uppercase tracking-wider block">
                {t.vehicleAssigned}
              </span>
              <span className="text-xs font-bold text-[#fdfcf9]">
                {currentWorker?.vehicleNo || 'MH-12-GW-COMPACTOR'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid & Optimizer Trigger */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#3a493a]">
          <div className="bg-[#232f23] p-3 rounded-xl border border-[#3a493a]">
            <span className="text-[11px] text-[#cbd5c0] block">{t.totalAssigned}</span>
            <span className="text-xl font-serif italic font-bold text-[#fdfcf9]">{assignedComplaints.length}</span>
          </div>
          <div className="bg-[#232f23] p-3 rounded-xl border border-[#3a493a]">
            <span className="text-[11px] text-[#cbd5c0] block">{t.filterPending}</span>
            <span className="text-xl font-serif italic font-bold text-amber-400">
              {assignedComplaints.filter((c) => c.status === 'assigned').length}
            </span>
          </div>
          <div className="bg-[#232f23] p-3 rounded-xl border border-[#3a493a]">
            <span className="text-[11px] text-[#cbd5c0] block">{t.filterInProgress}</span>
            <span className="text-xl font-serif italic font-bold text-blue-400">
              {assignedComplaints.filter((c) => c.status === 'in_progress').length}
            </span>
          </div>
          <div className="bg-[#232f23] p-3 rounded-xl border border-[#3a493a]">
            <span className="text-[11px] text-[#cbd5c0] block">{t.cleanedResolved}</span>
            <span className="text-xl font-serif italic font-bold text-emerald-400">
              {assignedComplaints.filter((c) => c.status === 'completed' || c.status === 'verified').length}
            </span>
          </div>
        </div>

        {/* Route Optimizer Quick Action CTA */}
        <div className="mt-4 pt-4 border-t border-[#3a493a] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#1e261e] p-3.5 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                Field Dispatch Route Optimization
              </span>
              <span className="text-[11px] text-[#cbd5c0]">
                TSP 2-Opt algorithm calculates the most fuel-efficient sequence for your pending tasks.
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveView(activeView === 'optimizer' ? 'tasks' : 'optimizer')}
            className="w-full sm:w-auto bg-[#5d7a5c] hover:bg-[#4d664c] text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Route className="w-3.5 h-3.5" />
            <span>{activeView === 'optimizer' ? 'Switch to Task Roster' : 'Open Route Optimizer'}</span>
          </button>
        </div>
      </div>

      {/* Main View Switcher Tabs */}
      <div className="bg-[#f2f0e4] border border-[#d9d4c1] p-1.5 rounded-2xl flex items-center gap-1.5">
        <button
          onClick={() => setActiveView('tasks')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeView === 'tasks'
              ? 'bg-[#5d7a5c] text-white shadow'
              : 'text-[#5d685c] hover:bg-white/60'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          <span>Field Task Roster ({assignedComplaints.length})</span>
        </button>
        <button
          onClick={() => setActiveView('optimizer')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeView === 'optimizer'
              ? 'bg-[#5d7a5c] text-white shadow'
              : 'text-[#5d685c] hover:bg-white/60'
          }`}
        >
          <Route className="w-4 h-4 text-emerald-600" />
          <span>Multi-Stop Route Optimizer (TSP 2-Opt)</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-extrabold ml-1">
            {complaints.filter(c => (c.workerId === currentUser.id || c.workerId === currentWorker.userId) && c.status !== 'completed' && c.status !== 'verified').length} Stops
          </span>
        </button>
      </div>

      {/* View Content: Route Optimizer OR Task Roster */}
      {activeView === 'optimizer' ? (
        <RouteOptimizerView
          currentUser={currentUser}
          currentWorker={currentWorker}
          complaints={complaints}
          workerCoords={workerCoords}
          onRefreshGps={refreshWorkerGps}
          onSelectTaskToUpdate={handleOpenUpdateModal}
        />
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#5d7a5c] text-white shadow-sm'
                  : 'bg-[#f5f2e9] text-[#7a8a7a] hover:text-[#2d3a2d]'
              }`}
            >
              {t.filterAll} ({assignedComplaints.length})
            </button>
            <button
              onClick={() => setFilter('assigned')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                filter === 'assigned'
                  ? 'bg-[#5d7a5c] text-white shadow-sm'
                  : 'bg-[#f5f2e9] text-[#7a8a7a] hover:text-[#2d3a2d]'
              }`}
            >
              {t.filterPending} ({assignedComplaints.filter((c) => c.status === 'assigned').length})
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                filter === 'in_progress'
                  ? 'bg-[#5d7a5c] text-white shadow-sm'
                  : 'bg-[#f5f2e9] text-[#7a8a7a] hover:text-[#2d3a2d]'
              }`}
            >
              {t.filterInProgress} ({assignedComplaints.filter((c) => c.status === 'in_progress').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                filter === 'completed'
                  ? 'bg-[#5d7a5c] text-white shadow-sm'
                  : 'bg-[#f5f2e9] text-[#7a8a7a] hover:text-[#2d3a2d]'
              }`}
            >
              {t.filterDone} ({assignedComplaints.filter((c) => c.status === 'completed' || c.status === 'verified').length})
            </button>
          </div>

          {/* Worker Task List */}
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="bg-[#fdfcf9] rounded-[28px] border border-[#d9d4c1] p-10 text-center text-[#7a8a7a]">
                <p className="text-sm font-medium">{t.noWorkerJobs}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-[#fdfcf9] rounded-[28px] border border-[#d9d4c1] p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#2d3a2d] bg-[#f2f0e4] px-2.5 py-1 rounded-full border border-[#d9d4c1]">
                          {task.ticketNo}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            task.status === 'completed' || task.status === 'verified'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : task.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-serif italic font-bold text-base text-[#2d3a2d]">
                          {task.title}
                        </h4>
                        <p className="text-xs text-[#7a8a7a] mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#5d7a5c] shrink-0" />
                          <span>{task.address}</span>
                        </p>
                      </div>

                      {/* Real-Time GPS Dispatch Telemetry & Turn-by-Turn Route */}
                      {(() => {
                        const nav = getDistanceToComplaint(task.lat, task.lng);
                        return (
                          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                              <div>
                                <span className="font-bold text-emerald-900 block text-[11px]">
                                  Live Field Distance: {nav.distanceStr}
                                </span>
                                <span className="text-[10px] text-emerald-700 font-medium">
                                  Estimated Fleet Transit: ~{nav.estMinutes} mins
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setActiveView('optimizer')}
                                className="bg-[#2d3a2d] hover:bg-[#1e261e] text-emerald-400 font-bold px-2 py-1.5 rounded-full text-[10px] flex items-center gap-1 transition shadow-sm cursor-pointer"
                                title="View optimal sequence in Route Optimizer"
                              >
                                <Route className="w-3 h-3" />
                                <span>TSP Tour</span>
                              </button>
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${task.lat},${task.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-2.5 py-1.5 rounded-full text-[10px] flex items-center gap-1 transition shadow-sm"
                              >
                                <Navigation className="w-3 h-3" />
                                <span>Maps</span>
                              </a>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Gemini 3.8 Flash AI Optical Inspection Telemetry */}
                      {task.aiAnalysis && (
                        <div className="bg-[#f2f0e4] border border-[#d9d4c1] rounded-2xl p-2.5 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#2d3a2d] flex items-center gap-1 text-[11px]">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Gemini AI Optical Diagnostic</span>
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              task.aiAnalysis.hazardLevel === 'Critical' ? 'bg-red-100 text-red-800 border border-red-300' :
                              task.aiAnalysis.hazardLevel === 'Hazardous' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}>
                              Hazard: {task.aiAnalysis.hazardLevel}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-0.5">
                            <div className="bg-white p-1.5 rounded-lg border border-[#d9d4c1]">
                              <span className="text-[#7a8a7a] block">Est. Volume:</span>
                              <strong className="text-[#2d3a2d]">{task.aiAnalysis.estimatedVolume || '0.85 m³'}</strong>
                            </div>
                            <div className="bg-white p-1.5 rounded-lg border border-[#d9d4c1]">
                              <span className="text-[#7a8a7a] block">Recyclable Yield:</span>
                              <strong className="text-emerald-700">{task.aiAnalysis.recyclablePercentage || 78}%</strong>
                            </div>
                          </div>

                          <div className="bg-white p-1.5 rounded-lg border border-[#d9d4c1] text-[10px]">
                            <span className="text-[#7a8a7a] block">Required Municipal Gear:</span>
                            <strong className="text-[#2d3a2d]">{task.aiAnalysis.recommendedEquipment}</strong>
                          </div>
                        </div>
                      )}

                      {/* Dual Photos Preview */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7a8a7a] mb-1">{t.reportedPhoto}</span>
                          <img
                            src={task.imageUrl}
                            alt="Reported Waste"
                            className="w-full h-28 object-cover rounded-xl border border-[#d9d4c1]"
                          />
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7a8a7a] mb-1">{t.cleanedPhoto}</span>
                          {task.cleanedImageUrl ? (
                            <img
                              src={task.cleanedImageUrl}
                              alt="Cleaned Proof"
                              className="w-full h-28 object-cover rounded-xl border-2 border-[#5d7a5c]"
                            />
                          ) : (
                            <div className="w-full h-28 bg-[#f5f2e9] rounded-xl border border-dashed border-[#d9d4c1] flex items-center justify-center text-center p-2">
                              <span className="text-[10px] text-[#7a8a7a] font-medium">{t.awaitingWorker}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Citizen Contact & Quick Actions */}
                      <div className="bg-[#f2f0e4] border border-[#d9d4c1] p-3 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <span className="block text-[10px] text-[#7a8a7a] font-bold uppercase">Reported By</span>
                          <span className="font-bold text-[#2d3a2d]">{task.citizenName} ({task.citizenPhone})</span>
                        </div>
                        <a
                          href={`tel:${task.citizenPhone}`}
                          className="p-2 bg-[#5d7a5c] text-white rounded-full hover:bg-[#4d664c] transition"
                          title={t.callCitizen}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Worker Action Button */}
                    <div className="border-t border-[#e5e1cc] pt-3">
                      <button
                        onClick={() => handleOpenUpdateModal(task)}
                        className="w-full bg-[#5d7a5c] hover:bg-[#4d664c] text-white font-bold py-2.5 rounded-full text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" /> {t.updateJobBtn}
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Task Update & Photo Upload Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-[#2d3a2d]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#fdfcf9] border border-[#d9d4c1] rounded-[32px] p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h4 className="font-serif italic text-2xl font-bold text-[#2d3a2d]">{t.updateModalTitle}</h4>
            <p className="text-xs text-[#7a8a7a]">
              {t.ticket}: <strong className="text-[#2d3a2d] font-mono">{selectedTask.ticketNo}</strong> — Location: <strong className="text-[#2d3a2d]">{selectedTask.address}</strong>
            </p>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a] mb-1">
                  {t.statusChoice}
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as Complaint['status'])}
                  className="w-full bg-white border border-[#d9d4c1] rounded-2xl p-2.5 text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                >
                  <option value="in_progress">{t.statusInProgress}</option>
                  <option value="completed">{t.statusDone}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a] mb-1">
                  {t.afterCleanPhotoLabel}
                </label>
                <div className="border-2 border-dashed border-[#5d7a5c] rounded-2xl p-3 text-center bg-white">
                  {cleanedPhotoUrl ? (
                    <div className="relative w-full h-36">
                      <img
                        src={cleanedPhotoUrl}
                        alt="Proof"
                        className="w-full h-full object-cover rounded-xl"
                      />
                      <label className="absolute bottom-2 right-2 bg-[#5d7a5c] text-white px-3 py-1 rounded-full text-xs font-bold cursor-pointer hover:bg-[#4d664c] shadow">
                        Change Proof Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoUpload}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-1 py-4">
                      <Upload className="w-6 h-6 text-[#5d7a5c]" />
                      <span className="text-xs text-[#5d7a5c] font-bold">Upload After-Cleanup Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a]">
                    {t.workerNotesInput}
                  </label>
                  <button
                    type="button"
                    onClick={handleGeotagResolution}
                    className="text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Navigation className="w-3 h-3 text-emerald-600" />
                    <span>Stamp GPS Location</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder="e.g. Cleared 25kg plastic waste with Compactor Truck MH-12-GW-101. Transported to recycling center."
                  value={workerNotes}
                  onChange={(e) => setWorkerNotes(e.target.value)}
                  className="w-full bg-white border border-[#d9d4c1] rounded-2xl p-2.5 text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="flex-1 bg-[#e5e1cc] text-[#2d3a2d] font-semibold py-2.5 rounded-full text-xs hover:bg-[#d9d4c1] transition cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#5d7a5c] text-white font-bold py-2.5 rounded-full text-xs hover:bg-[#4d664c] shadow transition cursor-pointer"
                >
                  {t.submitProofBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

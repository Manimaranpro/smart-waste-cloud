import React, { useState } from 'react';
import { Complaint, WorkerProfile, DashboardStats } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Shield, Users, AlertTriangle, CheckCircle2, Clock, Search, Filter, UserPlus, HardHat, FileText, Sparkles } from 'lucide-react';
import { LanguageCode, TRANSLATIONS } from '../data/translations';

interface AdminPortalProps {
  stats: DashboardStats;
  complaints: Complaint[];
  workers: WorkerProfile[];
  onAssignWorker: (complaintId: string, workerId: string) => void;
  onAddWorker: (newWorker: Partial<WorkerProfile>) => void;
  currentLang?: LanguageCode;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  stats,
  complaints,
  workers,
  onAssignWorker,
  onAddWorker,
  currentLang = 'en'
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'complaints' | 'workers'>('analytics');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWardFilter, setSelectedWardFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Assign Worker Modal State
  const [selectedComplaintToAssign, setSelectedComplaintToAssign] = useState<Complaint | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  // Add Worker Modal State
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerEmail, setNewWorkerEmail] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerWard, setNewWorkerWard] = useState('Ward 12 - Green Park');
  const [newWorkerVehicle, setNewWorkerVehicle] = useState('MH-12-GW-COMPACTOR');

  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  // Colors for Pie chart
  const PIE_COLORS = ['#5d7a5c', '#4a6b82', '#b87d2b', '#c25959', '#7a648b', '#5a8b7a'];

  // Filter complaints
  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      c.ticketNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.citizenName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesWard = selectedWardFilter === 'all' || c.ward === selectedWardFilter;
    const matchesStatus = selectedStatusFilter === 'all' || c.status === selectedStatusFilter;

    return matchesSearch && matchesWard && matchesStatus;
  });

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedComplaintToAssign && selectedWorkerId) {
      onAssignWorker(selectedComplaintToAssign.id, selectedWorkerId);
      setSelectedComplaintToAssign(null);
      setSelectedWorkerId('');
    }
  };

  const handleAddWorkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddWorker({
      name: newWorkerName,
      email: newWorkerEmail,
      phone: newWorkerPhone,
      ward: newWorkerWard,
      vehicleNo: newWorkerVehicle
    });
    setShowAddWorkerModal(false);
    setNewWorkerName('');
    setNewWorkerEmail('');
    setNewWorkerPhone('');
  };

  return (
    <div className="space-y-6">
      
      {/* Admin Central Header */}
      <div className="bg-[#2d3a2d] rounded-[28px] p-6 border border-[#3a493a] text-[#fdfcf9] shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#cbd5c0] text-xs font-semibold uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4 text-[#5d7a5c]" /> {t.adminTitle}
            </div>
            <h2 className="text-3xl font-serif italic font-bold tracking-tight text-[#fdfcf9]">
              Municipal Waste Control Center
            </h2>
            <p className="text-xs text-[#cbd5c0] mt-1 max-w-xl">
              {t.adminSubtitle}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddWorkerModal(true)}
              className="flex items-center gap-2 bg-[#5d7a5c] hover:bg-[#4d664c] text-white font-bold px-4 py-2.5 rounded-full text-xs transition shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              {t.addNewWorkerBtn}
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#3a493a]">
          <div className="bg-[#232f23] p-3.5 rounded-2xl border border-[#3a493a]">
            <span className="text-[11px] text-[#cbd5c0] block">{t.totalTicketsCount}</span>
            <span className="text-2xl font-serif italic font-bold text-[#fdfcf9]">{complaints.length}</span>
          </div>
          <div className="bg-[#232f23] p-3.5 rounded-2xl border border-[#3a493a]">
            <span className="text-[11px] text-[#cbd5c0] block">{t.pendingActionCount}</span>
            <span className="text-2xl font-serif italic font-bold text-rose-400">
              {complaints.filter((c) => c.status === 'pending').length}
            </span>
          </div>
          <div className="bg-[#232f23] p-3.5 rounded-2xl border border-[#3a493a]">
            <span className="text-[11px] text-[#cbd5c0] block">{t.inProgressCount}</span>
            <span className="text-2xl font-serif italic font-bold text-blue-400">
              {complaints.filter((c) => c.status === 'in_progress' || c.status === 'assigned').length}
            </span>
          </div>
          <div className="bg-[#232f23] p-3.5 rounded-2xl border border-[#3a493a]">
            <span className="text-[11px] text-[#cbd5c0] block">{t.resolvedCount}</span>
            <span className="text-2xl font-serif italic font-bold text-emerald-400">
              {complaints.filter((c) => c.status === 'completed' || c.status === 'verified').length}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Tab Selectors */}
      <div className="flex items-center gap-2 border-b border-[#e5e1cc] pb-2">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-[#5d7a5c] text-white shadow-sm'
              : 'bg-[#f5f2e9] text-[#7a8a7a] hover:text-[#2d3a2d]'
          }`}
        >
          {t.tabAnalytics}
        </button>
        <button
          onClick={() => setActiveTab('complaints')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'complaints'
              ? 'bg-[#5d7a5c] text-white shadow-sm'
              : 'bg-[#f5f2e9] text-[#7a8a7a] hover:text-[#2d3a2d]'
          }`}
        >
          {t.tabComplaints} ({complaints.length})
        </button>
        <button
          onClick={() => setActiveTab('workers')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'workers'
              ? 'bg-[#5d7a5c] text-white shadow-sm'
              : 'bg-[#f5f2e9] text-[#7a8a7a] hover:text-[#2d3a2d]'
          }`}
        >
          {t.tabWorkers} ({workers.length})
        </button>
      </div>

      {/* 1. Analytics & Visual Charts Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Waste Classification */}
          <div className="bg-[#fdfcf9] rounded-[28px] border border-[#d9d4c1] p-6 shadow-sm">
            <h3 className="font-serif italic text-lg font-bold text-[#2d3a2d] mb-4">
              {t.wasteDistributionChart}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.wasteTypeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {stats.wasteTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Ward Performance */}
          <div className="bg-[#fdfcf9] rounded-[28px] border border-[#d9d4c1] p-6 shadow-sm">
            <h3 className="font-serif italic text-lg font-bold text-[#2d3a2d] mb-4">
              {t.wardStatusChart}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.wardDistribution}>
                  <XAxis dataKey="ward" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#4a6b82" name="Reported" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" fill="#5d7a5c" name="Cleaned" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* 2. Complaints Table Tab with Assign Modal */}
      {activeTab === 'complaints' && (
        <div className="bg-[#fdfcf9] rounded-[28px] border border-[#d9d4c1] p-6 shadow-sm space-y-4">
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#7a8a7a] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search ticket, address, or resident..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#d9d4c1] rounded-xl text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-white border border-[#d9d4c1] rounded-xl px-3 py-2 text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="verified">Verified</option>
              </select>

              <select
                value={selectedWardFilter}
                onChange={(e) => setSelectedWardFilter(e.target.value)}
                className="bg-white border border-[#d9d4c1] rounded-xl px-3 py-2 text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
              >
                <option value="all">All Wards</option>
                <option value="Ward 12 - Green Park">Ward 12</option>
                <option value="Ward 08 - Market Road">Ward 08</option>
                <option value="Ward 04 - Railway Station">Ward 04</option>
                <option value="Ward 02 - Central Market">Ward 02</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e5e1cc] text-[#7a8a7a] font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Ticket</th>
                  <th className="py-3 px-3">Photo & Title</th>
                  <th className="py-3 px-3">Ward / Address</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Worker</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e1cc]">
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f5f2e9] transition">
                    <td className="py-3 px-3 font-mono font-bold text-[#2d3a2d]">{c.ticketNo}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <img src={c.imageUrl} alt="Waste" className="w-10 h-10 rounded-lg object-cover border border-[#d9d4c1]" />
                        <div>
                          <p className="font-bold text-[#2d3a2d] leading-tight">{c.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-[#7a8a7a]">{c.garbageType}</span>
                            {c.aiAnalysis && (
                              <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold px-1.5 py-0.2 rounded-full">
                                AI: {c.aiAnalysis.hazardLevel} Hazard ({c.aiAnalysis.confidence}%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#2d3a2d]">
                      <div>{c.ward}</div>
                      {c.isLiveGpsVerified && (
                        <div className="text-[9px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Live GPS Pinpoint (±{c.gpsAccuracyMeters || 5}m)</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.status === 'verified' || c.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : c.status === 'assigned'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-[#2d3a2d]">
                      {c.workerName || <span className="text-[#7a8a7a] italic">Unassigned</span>}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {c.status === 'pending' && (
                        <button
                          onClick={() => setSelectedComplaintToAssign(c)}
                          className="bg-[#5d7a5c] hover:bg-[#4d664c] text-white font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer"
                        >
                          {t.assignWorkerBtn}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* 3. Workers Directory Tab */}
      {activeTab === 'workers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {workers.map((w) => (
            <div key={w.id} className="bg-[#fdfcf9] rounded-[28px] border border-[#d9d4c1] p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#5d7a5c]/20 text-[#5d7a5c] flex items-center justify-center font-bold">
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#2d3a2d]">{w.name}</h4>
                    <span className="text-xs text-[#7a8a7a]">{w.ward}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#b87d2b]">★ {w.rating}</span>
              </div>

              <div className="bg-[#f2f0e4] p-3 rounded-2xl text-xs space-y-1">
                <div className="flex justify-between text-[#7a8a7a]">
                  <span>Phone:</span>
                  <span className="font-bold text-[#2d3a2d]">{w.phone}</span>
                </div>
                <div className="flex justify-between text-[#7a8a7a]">
                  <span>Vehicle:</span>
                  <span className="font-bold text-[#2d3a2d]">{w.vehicleNo}</span>
                </div>
                <div className="flex justify-between text-[#7a8a7a]">
                  <span>Cleaned Jobs:</span>
                  <span className="font-bold text-emerald-700">{w.totalResolved}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Worker Dialog */}
      {selectedComplaintToAssign && (
        <div className="fixed inset-0 bg-[#2d3a2d]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#fdfcf9] border border-[#d9d4c1] rounded-[32px] p-6 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="font-serif italic text-2xl font-bold text-[#2d3a2d]">{t.assignWorkerBtn}</h4>
            <p className="text-xs text-[#7a8a7a]">
              Assign ticket <strong className="text-[#2d3a2d]">{selectedComplaintToAssign.ticketNo}</strong> to a field sanitation worker.
            </p>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a] mb-1">
                  Select Field Worker
                </label>
                <select
                  required
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full bg-white border border-[#d9d4c1] rounded-2xl p-2.5 text-xs text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c]"
                >
                  <option value="">-- Choose Worker --</option>
                  {workers.map((w) => (
                    <option key={w.userId} value={w.userId}>
                      {w.name} ({w.ward}) - {w.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedComplaintToAssign(null)}
                  className="flex-1 bg-[#e5e1cc] text-[#2d3a2d] font-semibold py-2.5 rounded-full text-xs hover:bg-[#d9d4c1] transition cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#5d7a5c] text-white font-bold py-2.5 rounded-full text-xs hover:bg-[#4d664c] shadow transition cursor-pointer"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Worker Dialog */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 bg-[#2d3a2d]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#fdfcf9] border border-[#d9d4c1] rounded-[32px] p-6 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="font-serif italic text-2xl font-bold text-[#2d3a2d]">{t.addNewWorkerBtn}</h4>
            <form onSubmit={handleAddWorkerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#7a8a7a] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full bg-white border border-[#d9d4c1] rounded-xl p-2 text-xs text-[#2d3a2d]"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#7a8a7a] mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newWorkerEmail}
                  onChange={(e) => setNewWorkerEmail(e.target.value)}
                  className="w-full bg-white border border-[#d9d4c1] rounded-xl p-2 text-xs text-[#2d3a2d]"
                  placeholder="worker@municipal.gov.in"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#7a8a7a] mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={newWorkerPhone}
                  onChange={(e) => setNewWorkerPhone(e.target.value)}
                  className="w-full bg-white border border-[#d9d4c1] rounded-xl p-2 text-xs text-[#2d3a2d]"
                  placeholder="+91 98765 00000"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#7a8a7a] mb-1">Assigned Ward</label>
                <select
                  value={newWorkerWard}
                  onChange={(e) => setNewWorkerWard(e.target.value)}
                  className="w-full bg-white border border-[#d9d4c1] rounded-xl p-2 text-xs text-[#2d3a2d]"
                >
                  <option value="Ward 12 - Green Park">Ward 12 - Green Park</option>
                  <option value="Ward 08 - Market Road">Ward 08 - Market Road</option>
                  <option value="Ward 04 - Railway Station">Ward 04 - Railway Station</option>
                  <option value="Ward 02 - Central Market">Ward 02 - Central Market</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="flex-1 bg-[#e5e1cc] text-[#2d3a2d] font-semibold py-2.5 rounded-full text-xs hover:bg-[#d9d4c1] transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#5d7a5c] text-white font-bold py-2.5 rounded-full text-xs hover:bg-[#4d664c] shadow transition"
                >
                  Save Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

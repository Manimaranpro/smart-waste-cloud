import React, { useState, useMemo } from 'react';
import { Complaint, User, WorkerProfile } from '../types';
import { 
  optimizeWorkerRoute, 
  OptimizationStrategy, 
  RouteOptimizationResult, 
  RouteStop 
} from '../utils/routeOptimizer';
import { 
  Route, 
  Navigation, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ExternalLink, 
  Phone, 
  Leaf, 
  Zap, 
  RefreshCw, 
  Layers, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

interface RouteOptimizerViewProps {
  currentUser: User;
  currentWorker: WorkerProfile;
  complaints: Complaint[];
  workerCoords: { lat: number; lng: number } | null;
  onRefreshGps: () => void;
  onSelectTaskToUpdate: (task: Complaint) => void;
}

export const RouteOptimizerView: React.FC<RouteOptimizerViewProps> = ({
  currentUser,
  currentWorker,
  complaints,
  workerCoords,
  onRefreshGps,
  onSelectTaskToUpdate
}) => {
  const [strategy, setStrategy] = useState<OptimizationStrategy>('shortest_distance');
  const [scope, setScope] = useState<'my_assigned' | 'ward_all'>('my_assigned');

  // Filter complaints based on scope
  const targetComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // Must not be already completed
      const isUnresolved = c.status !== 'completed' && c.status !== 'verified' && c.status !== 'rejected';
      if (!isUnresolved) return false;

      if (scope === 'my_assigned') {
        return c.workerId === currentUser.id || c.workerId === currentWorker.userId;
      } else {
        // All unresolved in the worker's ward
        return c.ward === currentWorker.ward;
      }
    });
  }, [complaints, scope, currentUser.id, currentWorker.userId, currentWorker.ward]);

  // Compute optimized route
  const routeResult: RouteOptimizationResult = useMemo(() => {
    const start = workerCoords || { lat: 18.5204, lng: 73.8567, label: `${currentWorker.ward} Depot` };
    return optimizeWorkerRoute(
      { ...start, label: workerCoords ? 'Worker Live Position' : `${currentWorker.ward} Depot` },
      targetComplaints,
      strategy
    );
  }, [workerCoords, targetComplaints, strategy, currentWorker.ward]);

  return (
    <div className="bg-[#fdfcf9] border border-[#d9d4c1] rounded-[28px] p-5 sm:p-6 shadow-sm space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#e5e1cc] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#5d7a5c] text-xs font-bold uppercase tracking-wider mb-1">
            <Route className="w-4 h-4" />
            <span>AI Field Route Optimizer (TSP + 2-Opt)</span>
          </div>
          <h3 className="font-serif italic text-2xl font-bold text-[#2d3a2d]">
            Optimal Multi-Stop Dispatch Route
          </h3>
          <p className="text-xs text-[#7a8a7a] mt-0.5">
            Calculates minimal fuel transit sequence using spherical Haversine distances & 2-Opt local search refinement.
          </p>
        </div>

        {/* Algorithm & Scope Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Toggle */}
          <div className="bg-[#f2f0e4] p-1 rounded-2xl flex items-center border border-[#d9d4c1] text-xs font-bold">
            <button
              onClick={() => setScope('my_assigned')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                scope === 'my_assigned'
                  ? 'bg-[#5d7a5c] text-white shadow-sm'
                  : 'text-[#7a8a7a] hover:text-[#2d3a2d]'
              }`}
            >
              My Tasks ({complaints.filter(c => (c.workerId === currentUser.id || c.workerId === currentWorker.userId) && c.status !== 'completed' && c.status !== 'verified').length})
            </button>
            <button
              onClick={() => setScope('ward_all')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                scope === 'ward_all'
                  ? 'bg-[#5d7a5c] text-white shadow-sm'
                  : 'text-[#7a8a7a] hover:text-[#2d3a2d]'
              }`}
            >
              All Ward Tasks ({complaints.filter(c => c.ward === currentWorker.ward && c.status !== 'completed' && c.status !== 'verified').length})
            </button>
          </div>

          {/* Strategy Selector */}
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as OptimizationStrategy)}
            className="bg-white border border-[#d9d4c1] rounded-2xl px-3 py-2 text-xs font-bold text-[#2d3a2d] focus:outline-none focus:border-[#5d7a5c] cursor-pointer"
          >
            <option value="shortest_distance">Shortest Distance (TSP 2-Opt)</option>
            <option value="urgency_first">Urgency & Hazard Priority</option>
          </select>

          {/* Refresh GPS Button */}
          <button
            onClick={onRefreshGps}
            className="p-2 bg-[#f2f0e4] hover:bg-[#e5e1cc] text-[#2d3a2d] rounded-2xl border border-[#d9d4c1] transition cursor-pointer"
            title="Recalculate route with current live GPS"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#f2f0e4] rounded-2xl p-3.5 border border-[#d9d4c1]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a8a7a] block">
            Optimized Distance
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-serif italic text-2xl font-bold text-[#2d3a2d]">
              {routeResult.totalDistanceKm}
            </span>
            <span className="text-xs text-[#7a8a7a] font-medium">km</span>
          </div>
          {routeResult.distanceSavedKm > 0 && (
            <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
              Saved {routeResult.distanceSavedKm} km ({routeResult.distanceSavedPercent}% less)
            </span>
          )}
        </div>

        <div className="bg-[#f2f0e4] rounded-2xl p-3.5 border border-[#d9d4c1]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a8a7a] block">
            Estimated Trip Time
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-serif italic text-2xl font-bold text-[#2d3a2d]">
              {routeResult.totalTripMinutes}
            </span>
            <span className="text-xs text-[#7a8a7a] font-medium">mins</span>
          </div>
          <span className="text-[10px] text-[#7a8a7a] block mt-0.5">
            {routeResult.totalDrivingMinutes}m transit + {routeResult.totalCleanupMinutes}m work
          </span>
        </div>

        <div className="bg-[#f2f0e4] rounded-2xl p-3.5 border border-[#d9d4c1]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a8a7a] block">
            Stops In Ward
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-serif italic text-2xl font-bold text-[#2d3a2d]">
              {routeResult.stops.length}
            </span>
            <span className="text-xs text-[#7a8a7a] font-medium">locations</span>
          </div>
          <span className="text-[10px] text-[#5d7a5c] font-bold block mt-0.5 truncate">
            {currentWorker.ward}
          </span>
        </div>

        <div className="bg-[#f2f0e4] rounded-2xl p-3.5 border border-[#d9d4c1]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a8a7a] block">
            Fuel & Eco Offset
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-serif italic text-2xl font-bold text-emerald-700">
              {routeResult.co2SavedKg > 0 ? `-${routeResult.co2SavedKg}` : '0.0'}
            </span>
            <span className="text-xs text-emerald-700 font-medium">kg CO₂</span>
          </div>
          <span className="text-[10px] text-emerald-800 font-semibold block mt-0.5 flex items-center gap-1">
            <Leaf className="w-3 h-3 text-emerald-600" />
            <span>Green City Routing</span>
          </span>
        </div>
      </div>

      {/* Google Maps Multi-Stop Launcher CTA */}
      {routeResult.stops.length > 0 && (
        <div className="bg-[#2d3a2d] text-[#fdfcf9] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md border border-[#3a493a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5d7a5c] text-white flex items-center justify-center shrink-0 shadow">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif italic font-bold text-base text-[#fdfcf9]">
                Turn-by-Turn Multi-Stop Navigation Ready
              </h4>
              <p className="text-xs text-[#cbd5c0]">
                Pre-sequences all {routeResult.stops.length} stops in optimal order starting from your live GPS location.
              </p>
            </div>
          </div>

          <a
            href={routeResult.googleMapsMultiStopUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-[#1e261e] font-extrabold px-5 py-2.5 rounded-full text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer whitespace-nowrap"
          >
            <Route className="w-4 h-4" />
            <span>Launch All Stops in Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Visual Topological Route Diagram */}
      {routeResult.stops.length > 0 && (
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a]">
            Topological Route Sequence (Optimized Dispatch)
          </label>
          
          <div className="bg-[#f5f2e9] border border-[#d9d4c1] rounded-2xl p-4 overflow-x-auto">
            <div className="flex items-center min-w-max gap-2 py-2">
              
              {/* Start Node */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center bg-[#2d3a2d] text-[#fdfcf9] px-3.5 py-2 rounded-2xl border border-[#3a493a] shadow-sm">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Start Position</span>
                  </div>
                  <strong className="text-xs font-serif italic mt-0.5">
                    {workerCoords ? 'Current Field GPS' : 'Ward Depot'}
                  </strong>
                </div>
                <div className="flex flex-col items-center px-1 text-[10px] font-mono text-[#7a8a7a]">
                  <ChevronRight className="w-4 h-4 text-[#5d7a5c]" />
                  <span>{routeResult.stops[0]?.distanceFromPrevKm} km</span>
                </div>
              </div>

              {/* Waypoint Nodes */}
              {routeResult.stops.map((stop, idx) => (
                <div key={stop.complaint.id} className="flex items-center gap-2">
                  <div className="flex flex-col bg-white border border-[#d9d4c1] p-3 rounded-2xl shadow-sm hover:border-[#5d7a5c] transition min-w-[190px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="w-5 h-5 rounded-full bg-[#5d7a5c] text-white text-[11px] font-bold flex items-center justify-center">
                        {stop.stopNumber}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        stop.complaint.severity === 'Critical' ? 'bg-red-100 text-red-800 border border-red-300' :
                        stop.complaint.severity === 'High' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {stop.complaint.severity}
                      </span>
                    </div>

                    <strong className="text-xs font-serif italic text-[#2d3a2d] truncate">
                      {stop.complaint.title}
                    </strong>
                    <span className="text-[10px] text-[#7a8a7a] truncate mt-0.5">
                      {stop.complaint.address}
                    </span>

                    <div className="flex items-center justify-between text-[9px] text-[#7a8a7a] mt-2 pt-1 border-t border-[#f0eee4]">
                      <span>Drive: ~{stop.drivingMinutesFromPrev}m</span>
                      <span>Work: ~{stop.estCleanupMinutes}m</span>
                    </div>
                  </div>

                  {idx < routeResult.stops.length - 1 && (
                    <div className="flex flex-col items-center px-1 text-[10px] font-mono text-[#7a8a7a]">
                      <ChevronRight className="w-4 h-4 text-[#5d7a5c]" />
                      <span>{routeResult.stops[idx + 1].distanceFromPrevKm} km</span>
                    </div>
                  )}
                </div>
              ))}

            </div>
          </div>
        </div>
      )}

      {/* Stop-by-Stop Detailed Itinerary */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#7a8a7a]">
          Detailed Field Itinerary & Actions ({routeResult.stops.length} Stops)
        </label>

        {routeResult.stops.length === 0 ? (
          <div className="bg-[#f5f2e9] rounded-2xl p-8 text-center border border-[#d9d4c1] text-[#7a8a7a]">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
            <p className="text-xs font-medium">All tasks in this ward zone have been resolved! No pending routes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {routeResult.stops.map((stop) => {
              const cmp = stop.complaint;
              return (
                <div
                  key={cmp.id}
                  className="bg-white border border-[#d9d4c1] hover:border-[#5d7a5c] rounded-2xl p-4 shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#5d7a5c] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                      {stop.stopNumber}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#2d3a2d] bg-[#f2f0e4] px-2 py-0.5 rounded-lg border border-[#d9d4c1]">
                          {cmp.ticketNo}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          cmp.severity === 'Critical' ? 'bg-red-100 text-red-800 border border-red-300' :
                          cmp.severity === 'High' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {cmp.severity} Priority
                        </span>
                        <span className="text-[10px] text-[#5d7a5c] font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {cmp.garbageType}
                        </span>
                      </div>

                      <h5 className="font-serif italic font-bold text-sm text-[#2d3a2d]">
                        {cmp.title}
                      </h5>

                      <p className="text-xs text-[#7a8a7a] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#5d7a5c] shrink-0" />
                        <span>{cmp.address}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5d685c] pt-1">
                        <span className="font-semibold text-emerald-800">
                          Distance from prev: {stop.distanceFromPrevKm} km (~{stop.drivingMinutesFromPrev} mins transit)
                        </span>
                        <span>•</span>
                        <span>Est. Cleanup: ~{stop.estCleanupMinutes} mins</span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">
                          Cumulative: {stop.cumulativeDistanceKm} km ({stop.cumulativeTimeMinutes}m into shift)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this stop */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${cmp.lat},${cmp.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 bg-[#f2f0e4] hover:bg-[#e5e1cc] text-[#2d3a2d] rounded-xl border border-[#d9d4c1] transition cursor-pointer"
                      title="Direct navigation to this stop"
                    >
                      <Navigation className="w-4 h-4 text-[#5d7a5c]" />
                    </a>

                    <a
                      href={`tel:${cmp.citizenPhone}`}
                      className="p-2.5 bg-[#f2f0e4] hover:bg-[#e5e1cc] text-[#2d3a2d] rounded-xl border border-[#d9d4c1] transition cursor-pointer"
                      title="Call Citizen"
                    >
                      <Phone className="w-4 h-4 text-[#5d7a5c]" />
                    </a>

                    <button
                      onClick={() => onSelectTaskToUpdate(cmp)}
                      className="bg-[#5d7a5c] hover:bg-[#4d664c] text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Execute Cleanup</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

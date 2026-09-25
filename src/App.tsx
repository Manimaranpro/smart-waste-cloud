import React, { useState, useEffect } from 'react';
import { UserRole, User, Complaint, WorkerProfile, AppNotification, DashboardStats } from './types';
import { INITIAL_USERS, INITIAL_WORKERS, INITIAL_COMPLAINTS, INITIAL_NOTIFICATIONS } from './data/mockData';
import { Navbar } from './components/Navbar';
import { CitizenPortal } from './components/CitizenPortal';
import { WorkerPortal } from './components/WorkerPortal';
import { AdminPortal } from './components/AdminPortal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AuthModal } from './components/AuthModal';
import { LanguageCode, TRANSLATIONS } from './data/translations';

export default function App() {
  // Rehydrate authenticated user from persistent storage so exiting & re-opening URL never logs them out
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const savedUser = localStorage.getItem('smartwaste_current_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.id && parsed.name) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_USERS[4]; // Default Citizen Ananya if first time
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      const savedUser = localStorage.getItem('smartwaste_current_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.role) {
          return parsed.role;
        }
      }
    } catch {}
    return 'citizen';
  });

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<LanguageCode>('en');

  // App Data State
  const [complaints, setComplaints] = useState<Complaint[]>(INITIAL_COMPLAINTS);
  const [workers, setWorkers] = useState<WorkerProfile[]>(INITIAL_WORKERS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  // Stats calculation
  const [stats, setStats] = useState<DashboardStats>({
    totalComplaints: INITIAL_COMPLAINTS.length,
    pendingComplaints: INITIAL_COMPLAINTS.filter((c) => c.status === 'pending').length,
    inProgressComplaints: INITIAL_COMPLAINTS.filter((c) => c.status === 'in_progress' || c.status === 'assigned').length,
    resolvedComplaints: INITIAL_COMPLAINTS.filter((c) => c.status === 'completed' || c.status === 'verified').length,
    activeWorkers: INITIAL_WORKERS.length,
    avgResolutionHours: 3.4,
    wasteTypeDistribution: [
      { name: 'Plastic & Recyclable', count: 2, percentage: 50 },
      { name: 'Overflowing Dumpster', count: 1, percentage: 25 },
      { name: 'Construction', count: 1, percentage: 25 }
    ],
    wardDistribution: [
      { ward: 'W-12', count: 2, resolved: 1 },
      { ward: 'W-08', count: 1, resolved: 0 },
      { ward: 'W-04', count: 1, resolved: 1 }
    ],
    dailyTrends: [
      { date: 'Aug 01', reported: 4, resolved: 3 },
      { date: 'Aug 02', reported: 6, resolved: 5 },
      { date: 'Aug 03', reported: 8, resolved: 6 },
      { date: 'Aug 04', reported: INITIAL_COMPLAINTS.length, resolved: 2 }
    ]
  });

  // Rehydrate active user from MongoDB / server on load
  useEffect(() => {
    rehydrateUser();
    fetchComplaints();
    fetchWorkers();
    fetchAnalytics();
  }, []);

  const rehydrateUser = async () => {
    try {
      const savedUserStr = localStorage.getItem('smartwaste_current_user');
      if (!savedUserStr) return;
      const parsed = JSON.parse(savedUserStr);
      if (!parsed || !parsed.email) return;

      const res = await fetch(`/api/auth/me?email=${encodeURIComponent(parsed.email)}&userId=${encodeURIComponent(parsed.id || '')}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          setCurrentRole(data.user.role);
          localStorage.setItem('smartwaste_current_user', JSON.stringify(data.user));
        }
      }
    } catch {}
  };

  const fetchComplaints = async () => {
    try {
      const res = await fetch('/api/complaints');
      if (res.ok) {
        const data = await res.json();
        if (data.complaints && data.complaints.length > 0) {
          setComplaints(data.complaints);
        }
      }
    } catch {
      console.log('Using local client state');
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await fetch('/api/workers');
      if (res.ok) {
        const data = await res.json();
        if (data.workers && data.workers.length > 0) {
          setWorkers(data.workers);
        }
      }
    } catch {
      console.log('Using local workers state');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch {
      console.log('Using local stats state');
    }
  };

  // Switch Role handler
  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (role === 'admin') {
      const adminUser = INITIAL_USERS[0];
      setCurrentUser(adminUser);
      try { localStorage.setItem('smartwaste_current_user', JSON.stringify(adminUser)); } catch {}
    } else if (role === 'worker') {
      const workerUser = INITIAL_USERS[1];
      setCurrentUser(workerUser);
      try { localStorage.setItem('smartwaste_current_user', JSON.stringify(workerUser)); } catch {}
    } else {
      const citizenUser = INITIAL_USERS[4];
      setCurrentUser(citizenUser);
      try { localStorage.setItem('smartwaste_current_user', JSON.stringify(citizenUser)); } catch {}
    }
  };

  // Custom User Login / Profile change
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    try {
      localStorage.setItem('smartwaste_current_user', JSON.stringify(user));
    } catch {}
  };

  // Logout handler - clears session so new account can be tested cleanly
  const handleLogout = () => {
    try {
      localStorage.removeItem('smartwaste_current_user');
      localStorage.removeItem('smartwaste_token');
    } catch {}
    setIsAuthOpen(true);
  };

  // Submit New Complaint
  const handleSubmitComplaint = async (newCompData: Partial<Complaint>) => {
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompData)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.complaint) {
          setComplaints((prev) => [data.complaint, ...prev]);
        }
      }
    } catch {
      // Local fallback
      const newTicket: Complaint = {
        id: `cmp-${Date.now()}`,
        ticketNo: `WM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title: newCompData.title || 'New Waste Complaint',
        description: newCompData.description || 'Reported by resident.',
        garbageType: newCompData.garbageType || 'Plastic & Recyclable',
        severity: newCompData.severity || 'High',
        address: newCompData.address || 'Green Park Avenue',
        ward: newCompData.ward || 'Ward 12 - Green Park',
        lat: 18.5204,
        lng: 73.8567,
        imageUrl: newCompData.imageUrl || 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80',
        status: 'pending',
        citizenId: currentUser.id,
        citizenName: currentUser.name,
        citizenPhone: currentUser.phone || '+91 99887 76655',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setComplaints((prev) => [newTicket, ...prev]);
    }

    // Refresh analytics
    fetchAnalytics();
  };

  // Assign Worker
  const handleAssignWorker = async (complaintId: string, workerId: string) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.complaint) {
          setComplaints((prev) => prev.map((c) => (c.id === complaintId ? data.complaint : c)));
        }
      }
    } catch {
      const worker = workers.find((w) => w.userId === workerId || w.id === workerId);
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId
            ? {
                ...c,
                workerId,
                workerName: worker?.name || 'Assigned Worker',
                workerPhone: worker?.phone || '+91 98000 00000',
                status: 'assigned',
                updatedAt: new Date().toISOString()
              }
            : c
        )
      );
    }
  };

  // Update Status & Cleaned Photo
  const handleUpdateStatus = async (
    complaintId: string,
    status: Complaint['status'],
    cleanedImageUrl?: string,
    notes?: string
  ) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, cleanedImageUrl, workerNotes: notes })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.complaint) {
          setComplaints((prev) => prev.map((c) => (c.id === complaintId ? data.complaint : c)));
        }
      }
    } catch {
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId
            ? {
                ...c,
                status,
                cleanedImageUrl: cleanedImageUrl || c.cleanedImageUrl,
                workerNotes: notes || c.workerNotes,
                updatedAt: new Date().toISOString()
              }
            : c
        )
      );
    }
  };

  // Submit Feedback
  const handleSubmitFeedback = async (complaintId: string, rating: number, comment: string) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.complaint) {
          setComplaints((prev) => prev.map((c) => (c.id === complaintId ? data.complaint : c)));
        }
      }
    } catch {
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId
            ? {
                ...c,
                feedbackRating: rating,
                feedbackComment: comment,
                status: 'verified'
              }
            : c
        )
      );
    }
  };

  // Add Worker
  const handleAddWorker = async (newWorkerData: Partial<WorkerProfile>) => {
    try {
      const res = await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorkerData)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.worker) {
          setWorkers((prev) => [...prev, data.worker]);
        }
      }
    } catch {
      const newW: WorkerProfile = {
        id: `wk-${Date.now()}`,
        userId: `usr-worker-${Date.now()}`,
        name: newWorkerData.name || 'New Worker',
        email: newWorkerData.email || 'worker@municipal.gov.in',
        phone: newWorkerData.phone || '+91 98000 00000',
        ward: newWorkerData.ward || 'Ward 12 - Green Park',
        status: 'active',
        totalAssigned: 0,
        totalResolved: 0,
        rating: 5.0,
        vehicleNo: newWorkerData.vehicleNo || 'MH-12-GW-COMPACTOR'
      };
      setWorkers((prev) => [...prev, newW]);
    }
  };

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#fdfcf9] text-[#3a4439] font-sans flex flex-col justify-between selection:bg-[#5d7a5c] selection:text-white">
      
      <div>
        {/* Navigation Bar without the top green banner */}
        <Navbar
          currentRole={currentRole}
          currentUser={currentUser}
          onRoleChange={handleRoleChange}
          unreadCount={unreadNotifCount}
          onOpenNotifs={() => setIsNotifOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
          currentLang={currentLang}
          onLangChange={setCurrentLang}
        />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {currentRole === 'citizen' && (
            <CitizenPortal
              currentUser={currentUser}
              complaints={complaints}
              onSubmitComplaint={handleSubmitComplaint}
              onSubmitFeedback={handleSubmitFeedback}
              currentLang={currentLang}
            />
          )}

          {currentRole === 'worker' && (
            <WorkerPortal
              currentUser={currentUser}
              workers={workers}
              complaints={complaints}
              onUpdateStatus={handleUpdateStatus}
              currentLang={currentLang}
            />
          )}

          {currentRole === 'admin' && (
            <AdminPortal
              stats={stats}
              complaints={complaints}
              workers={workers}
              onAssignWorker={handleAssignWorker}
              onAddWorker={handleAddWorker}
              currentLang={currentLang}
            />
          )}
        </main>
      </div>

      {/* Simplified Footer */}
      <footer className="bg-[#2d3a2d] border-t border-[#3a493a] text-[#cbd5c0] py-6 text-xs text-center mt-12">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-serif italic text-sm font-bold text-[#fdfcf9]">
            {t.appTitle} — {t.appSubtitle}
          </p>
          <p className="text-[#7a8a7a]">
            Clean City Smart Waste Monitoring & Field Operations
          </p>
        </div>
      </footer>

      {/* Notifications Drawer */}
      <NotificationDrawer
        notifications={notifications}
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onMarkRead={(id) =>
          setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
        }
      />

      {/* Sign In / User Registration & Profile Photo Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        currentLang={currentLang}
      />

    </div>
  );
}

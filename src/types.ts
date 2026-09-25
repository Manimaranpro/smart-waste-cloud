export type UserRole = 'admin' | 'worker' | 'citizen';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone?: string;
  ward?: string;
  avatar?: string;
  createdAt?: string;
}

export type GarbageType = 
  | 'Bio-degradable / Organic'
  | 'Plastic & Recyclable'
  | 'E-Waste / Electronics'
  | 'Hazardous & Medical'
  | 'Construction & Heavy'
  | 'Overflowing Public Dumpster'
  | 'General Mixed Solid Waste';

export type ComplaintSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type ComplaintStatus = 
  | 'pending' 
  | 'assigned' 
  | 'in_progress' 
  | 'completed' 
  | 'verified' 
  | 'rejected';

export interface Complaint {
  id: string;
  ticketNo: string;
  title: string;
  description: string;
  garbageType: GarbageType;
  severity: ComplaintSeverity;
  address: string;
  ward: string;
  lat: number;
  lng: number;
  imageUrl: string;
  cleanedImageUrl?: string;
  status: ComplaintStatus;
  citizenId: string;
  citizenName: string;
  citizenPhone: string;
  workerId?: string;
  workerName?: string;
  workerPhone?: string;
  createdAt: string;
  updatedAt: string;
  assignedAt?: string;
  completedAt?: string;
  workerNotes?: string;
  feedbackRating?: number;
  feedbackComment?: string;
  priorityScore?: number;
  estimatedFillPercent?: number;
  gpsAccuracyMeters?: number;
  isLiveGpsVerified?: boolean;
  aiAnalysis?: {
    detectedType: string;
    hazardLevel: 'Safe' | 'Moderate' | 'Hazardous' | 'Critical';
    confidence: number;
    recyclablePercentage: number;
    estimatedVolume: string;
    carbonOffsetKg: number;
    recommendedEquipment: string;
    aiAnalysisNotes: string;
  };
}

export interface WorkerProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  ward: string;
  status: 'active' | 'busy' | 'offline';
  totalAssigned: number;
  totalResolved: number;
  rating: number;
  vehicleNo?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  role: UserRole;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  complaintId?: string;
}

export interface DashboardStats {
  totalComplaints: number;
  pendingComplaints: number;
  inProgressComplaints: number;
  resolvedComplaints: number;
  activeWorkers: number;
  avgResolutionHours: number;
  wasteTypeDistribution: { name: string; count: number; percentage: number }[];
  wardDistribution: { ward: string; count: number; resolved: number }[];
  dailyTrends: { date: string; reported: number; resolved: number }[];
}

export interface FlaskSourceFile {
  path: string;
  category: 'core' | 'routes' | 'models' | 'templates' | 'static' | 'docs' | 'config';
  description: string;
  content: string;
}

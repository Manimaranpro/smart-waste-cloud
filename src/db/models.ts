import mongoose from 'mongoose';
import { User, WorkerProfile, Complaint, AppNotification } from '../types.js';

// Define Mongoose Schemas with plain TS interfaces
const UserSchema = new mongoose.Schema<User>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['citizen', 'worker', 'admin'], default: 'citizen' },
  phone: { type: String },
  ward: { type: String },
  avatar: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { strict: false });

const WorkerSchema = new mongoose.Schema<WorkerProfile>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  ward: { type: String, required: true },
  status: { type: String, enum: ['active', 'busy', 'offline'], default: 'active' },
  totalAssigned: { type: Number, default: 0 },
  totalResolved: { type: Number, default: 0 },
  rating: { type: Number, default: 5.0 },
  vehicleNo: { type: String, default: 'MH-12-GW-COMPACTOR' }
}, { strict: false });

const ComplaintSchema = new mongoose.Schema<Complaint>({
  id: { type: String, required: true, unique: true },
  ticketNo: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  garbageType: { type: String, required: true },
  severity: { type: String, required: true },
  address: { type: String, required: true },
  ward: { type: String, required: true },
  lat: { type: Number, default: 18.5204 },
  lng: { type: Number, default: 73.8567 },
  imageUrl: { type: String, required: true },
  cleanedImageUrl: { type: String },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_progress', 'completed', 'verified'],
    default: 'pending'
  },
  citizenId: { type: String, required: true },
  citizenName: { type: String, required: true },
  citizenPhone: { type: String, required: true },
  workerId: { type: String },
  workerName: { type: String },
  workerPhone: { type: String },
  workerNotes: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
  assignedAt: { type: String },
  completedAt: { type: String },
  feedbackRating: { type: Number },
  feedbackComment: { type: String },
  priorityScore: { type: Number, default: 75 },
  estimatedFillPercent: { type: Number, default: 80 }
}, { strict: false });

const NotificationSchema = new mongoose.Schema<AppNotification>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'worker', 'admin'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
  read: { type: Boolean, default: false },
  complaintId: { type: String }
}, { strict: false });

export const UserModel = mongoose.models.User || mongoose.model<User>('User', UserSchema);
export const WorkerModel = mongoose.models.Worker || mongoose.model<WorkerProfile>('Worker', WorkerSchema);
export const ComplaintModel = mongoose.models.Complaint || mongoose.model<Complaint>('Complaint', ComplaintSchema);
export const NotificationModel = mongoose.models.Notification || mongoose.model<AppNotification>('Notification', NotificationSchema);

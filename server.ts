import "dotenv/config";
import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import mongoose from "mongoose";
import { INITIAL_COMPLAINTS, INITIAL_WORKERS, INITIAL_USERS, INITIAL_NOTIFICATIONS } from "./src/data/mockData.js";
import { Complaint, WorkerProfile, User, AppNotification, DumpsterBin } from "./src/types.js";
import { UserModel, WorkerModel, ComplaintModel, NotificationModel, DumpsterModel } from "./src/db/models.js";

const INITIAL_DUMPSTERS: DumpsterBin[] = [
  {
    binId: "BIN-W12-04",
    ward: "Ward 12 - Green Park",
    address: "Green Park Avenue, Gate 2 (Commercial Market Bin #04)",
    lat: 18.5235,
    lng: 73.8542,
    capacityLitres: 1100,
    dumpsterType: "Hydraulic Rear-Lift Dumpster",
    installedDate: "2025-03-15",
    createdBy: "usr-admin-1",
    createdAt: "2025-03-15T09:00:00Z"
  },
  {
    binId: "BIN-W08-02",
    ward: "Ward 08 - Market Road",
    address: "Market Road Commercial Transit Hub, Gate 3 (Bin #02)",
    lat: 18.5312,
    lng: 73.8491,
    capacityLitres: 1200,
    dumpsterType: "Dual-Compartment Segregated Bin",
    installedDate: "2025-05-10",
    createdBy: "usr-admin-1",
    createdAt: "2025-05-10T09:00:00Z"
  },
  {
    binId: "BIN-W04-07",
    ward: "Ward 04 - Railway Station",
    address: "Railway Station South Exit & Auto Stand (Bin #07)",
    lat: 18.5289,
    lng: 73.8744,
    capacityLitres: 1500,
    dumpsterType: "Heavy-Duty Metal Compactor Bin",
    installedDate: "2024-11-20",
    createdBy: "usr-admin-1",
    createdAt: "2024-11-20T09:00:00Z"
  },
  {
    binId: "BIN-W02-09",
    ward: "Ward 02 - Central Market",
    address: "Central Market Vegetable & Fruit Plaza (Bin #09)",
    lat: 18.5165,
    lng: 73.8560,
    capacityLitres: 2400,
    dumpsterType: "Large Roll-On Roll-Off Bin",
    installedDate: "2025-01-18",
    createdBy: "usr-admin-1",
    createdAt: "2025-01-18T09:00:00Z"
  }
];

// Hybrid Store (Always active so preview/demo works immediately, synced with MongoDB Atlas when MONGODB_URI is set)
let usersStore: User[] = [...INITIAL_USERS];
let workersStore: WorkerProfile[] = [...INITIAL_WORKERS];
let complaintsStore: Complaint[] = [...INITIAL_COMPLAINTS];
let notificationsStore: AppNotification[] = [...INITIAL_NOTIFICATIONS];
let dumpstersStore: DumpsterBin[] = [...INITIAL_DUMPSTERS];
let isMongoConnected = false;

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(plain: string, stored?: string): boolean {
  if (!stored) return true;
  if (stored.startsWith("scrypt$")) {
    const parts = stored.split("$");
    if (parts.length !== 3) return false;
    const [, salt, storedHashHex] = parts;
    try {
      const derived = crypto.scryptSync(plain, salt, 64);
      const storedBuf = Buffer.from(storedHashHex, "hex");
      return derived.length === storedBuf.length && crypto.timingSafeEqual(derived, storedBuf);
    } catch {
      return false;
    }
  }
  return stored === plain;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeUser(u: any): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    ward: u.ward,
    avatar: u.avatar,
    createdAt: u.createdAt
  };
}

// Lazy MongoDB Atlas Connection (never crashes server boot)
async function connectToMongoDB(): Promise<boolean> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || !mongoUri.trim()) {
    console.log("MONGODB_URI not configured. Running with hybrid in-memory cloud store.");
    isMongoConnected = false;
    return false;
  }

  try {
    if (mongoose.connection.readyState === 1) {
      isMongoConnected = true;
      return true;
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    isMongoConnected = true;
    console.log("Successfully connected to MongoDB Atlas database!");

    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      console.log("Seeding initial users, workers, complaints, and notifications into MongoDB...");
      const seededUsers = INITIAL_USERS.map((u) => ({
        ...u,
        password: hashPassword(u.role === "admin" ? "admin123" : "demo123")
      }));
      await UserModel.insertMany(seededUsers);
      await WorkerModel.insertMany(INITIAL_WORKERS);
      await ComplaintModel.insertMany(INITIAL_COMPLAINTS);
      await NotificationModel.insertMany(INITIAL_NOTIFICATIONS);
    }

    const dumpsterCount = await DumpsterModel.countDocuments();
    if (dumpsterCount === 0) {
      await DumpsterModel.insertMany(INITIAL_DUMPSTERS);
    }
    return true;
  } catch (err) {
    console.error("MongoDB connection warning (falling back to active cloud store):", err);
    isMongoConnected = false;
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  connectToMongoDB().catch(() => {});

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI | null {
    if (!aiClient && process.env.GEMINI_API_KEY) {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
    return aiClient;
  }

  const serverStartTime = Date.now();
  app.get("/api/health", (_req, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    res.json({
      status: "online",
      server: "Cloud Node/Express Smart Waste Server",
      uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
      timestamp: new Date().toISOString(),
      mode: process.env.NODE_ENV || "development",
      database: dbReady ? "MongoDB Connected" : "Cloud In-Memory (Active)",
      aiEnabled: !!process.env.GEMINI_API_KEY
    });
  });

  // 1. Auth Login, Registration, Profile & Session Rehydration
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, role } = req.body || {};
      if (!email && !role) {
        return res.status(400).json({ error: "Email or role is required to sign in." });
      }

      let matchedUser: any = null;
      if (isMongoConnected && email) {
        try {
          const found = await UserModel.findOne({
            email: new RegExp(`^${escapeRegex(email.trim())}$`, "i")
          }).lean();
          if (found) matchedUser = found;
        } catch (dbErr) {
          console.error("MongoDB login query error:", dbErr);
        }
      }

      if (!matchedUser && email) {
        matchedUser = usersStore.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) || null;
      }

      if (matchedUser) {
        if (matchedUser.password && password) {
          const isDemoSeedAccount = INITIAL_USERS.some((u) => u.email.toLowerCase() === matchedUser.email.toLowerCase());
          const ok =
            verifyPassword(password, matchedUser.password) ||
            (isDemoSeedAccount && (password === "demo123" || (matchedUser.role === "admin" && password === "admin123")));
          if (!ok) {
            return res.status(401).json({ error: "Incorrect password. Please verify your credentials." });
          }
        }
      } else if (role && !email) {
        matchedUser = usersStore.find((u) => u.role === role) || usersStore[0];
      } else if (email) {
        return res.status(404).json({ error: "No account found with this email. Please click 'Register' to create your account." });
      }

      if (!matchedUser) {
        return res.status(401).json({ error: "Authentication failed. Please check your credentials." });
      }

      const sanitizedUser = sanitizeUser(matchedUser);
      const token = `swms_token_${sanitizedUser.id}_${Date.now()}`;
      return res.json({ success: true, user: sanitizedUser, token });
    } catch (err) {
      console.error("Login route error:", err);
      return res.status(500).json({ error: "Login process failed. Please retry." });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, phone, ward, role, avatar } = req.body || {};
      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required for registration." });
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (isMongoConnected) {
        try {
          const existingInDb = await UserModel.findOne({
            email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i")
          }).lean();
          if (existingInDb) {
            return res.status(400).json({ error: "An account with this email already exists. Please Sign In." });
          }
        } catch (dbErr) {
          console.error("MongoDB register check error:", dbErr);
        }
      }

      if (usersStore.some((u) => u.email.toLowerCase() === normalizedEmail)) {
        return res.status(400).json({ error: "An account with this email already exists. Please Sign In." });
      }

      const newUserId = `usr-${Date.now()}`;
      const newUserRecord = {
        id: newUserId,
        name: name.trim(),
        email: normalizedEmail,
        password: hashPassword(password || "smartwaste2026"),
        phone: phone || "+91 98000 11122",
        ward: ward || "Ward 12 - Green Park",
        role: role || "citizen",
        avatar: avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
        createdAt: new Date().toISOString()
      };

      usersStore.push(newUserRecord);

      let newWorker: WorkerProfile | null = null;
      if (newUserRecord.role === "worker") {
        newWorker = {
          id: `wk-${Date.now()}`,
          userId: newUserId,
          name: newUserRecord.name,
          email: newUserRecord.email,
          phone: newUserRecord.phone,
          ward: newUserRecord.ward,
          status: "active",
          totalAssigned: 0,
          totalResolved: 0,
          rating: 5.0,
          vehicleNo: "MH-12-GW-NEW"
        };
        workersStore.push(newWorker);
      }

      if (isMongoConnected) {
        try {
          await UserModel.create(newUserRecord);
          if (newWorker) await WorkerModel.create(newWorker);
        } catch (mErr) {
          console.error("MongoDB user save error:", mErr);
        }
      }

      const sanitizedUser = sanitizeUser(newUserRecord);
      const token = `swms_token_${sanitizedUser.id}_${Date.now()}`;
      return res.json({ success: true, user: sanitizedUser, token });
    } catch (err) {
      console.error("Registration error:", err);
      return res.status(500).json({ error: "Registration failed. Please retry." });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const email = req.query.email as string;
      const userId = req.query.userId as string;
      let user: any = null;

      if (isMongoConnected) {
        if (userId) user = await UserModel.findOne({ id: userId }).lean();
        if (!user && email) {
          user = await UserModel.findOne({ email: new RegExp(`^${escapeRegex(email.trim())}$`, "i") }).lean();
        }
      }
      if (!user) {
        if (userId) user = usersStore.find((u) => u.id === userId);
        if (!user && email) user = usersStore.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      }

      if (!user) {
        return res.status(404).json({ error: "Session expired or user not found" });
      }
      return res.json({ success: true, user: sanitizeUser(user) });
    } catch {
      return res.status(500).json({ error: "Session check failed" });
    }
  });

  app.put("/api/auth/profile", async (req, res) => {
    try {
      const { userId, email, name, phone, ward, avatar } = req.body || {};
      const updates: Partial<User> = {};
      if (typeof name === "string" && name.trim()) updates.name = name.trim();
      if (typeof phone === "string" && phone.trim()) updates.phone = phone.trim();
      if (typeof ward === "string" && ward.trim()) updates.ward = ward.trim();
      if (typeof avatar === "string" && avatar.trim()) updates.avatar = avatar.trim();

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid profile fields provided to update." });
      }

      let updatedUser: User | null = null;

      if (isMongoConnected && (userId || email)) {
        const filter = userId
          ? { id: userId }
          : { email: new RegExp(`^${escapeRegex(String(email).trim())}$`, "i") };
        const doc = await UserModel.findOneAndUpdate(filter, { $set: updates }, { new: true }).lean();
        if (doc) updatedUser = sanitizeUser(doc);

        // Keep linked WorkerProfile synced if user is a worker
        const workerUpdates: Record<string, string> = {};
        if (updates.name) workerUpdates.name = updates.name;
        if (updates.phone) workerUpdates.phone = updates.phone;
        if (updates.ward) workerUpdates.ward = updates.ward;
        if (Object.keys(workerUpdates).length > 0 && userId) {
          await WorkerModel.updateOne({ userId }, { $set: workerUpdates }).catch(() => {});
        }
      }

      const idx = usersStore.findIndex(
        (u) => (userId && u.id === userId) || (email && u.email.toLowerCase() === String(email).toLowerCase())
      );
      if (idx !== -1) {
        usersStore[idx] = { ...usersStore[idx], ...updates };
        if (!updatedUser) updatedUser = sanitizeUser(usersStore[idx]);
      } else if (updatedUser) {
        usersStore.push({ ...updatedUser, password: "" });
      }

      const wIdx = workersStore.findIndex(
        (w) => (userId && w.userId === userId) || (email && w.email.toLowerCase() === String(email).toLowerCase())
      );
      if (wIdx !== -1) {
        if (updates.name) workersStore[wIdx].name = updates.name;
        if (updates.phone) workersStore[wIdx].phone = updates.phone;
        if (updates.ward) workersStore[wIdx].ward = updates.ward;
      }

      if (!updatedUser) {
        return res.status(404).json({ error: "User profile not found." });
      }
      return res.json({ success: true, user: updatedUser });
    } catch (err) {
      console.error("Profile update error:", err);
      return res.status(500).json({ error: "Failed to save profile changes." });
    }
  });

  // 2. Complaints API
  app.get("/api/complaints", async (req, res) => {
    try {
      const { ward, status } = req.query;
      let list = [...complaintsStore];

      if (isMongoConnected) {
        try {
          const dbComplaints = await ComplaintModel.find({}, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean();
          if (dbComplaints && dbComplaints.length > 0) {
            list = dbComplaints as Complaint[];
          }
        } catch (dbErr) {
          console.error("MongoDB fetch complaints error:", dbErr);
        }
      }

      if (typeof ward === "string" && ward !== "all") {
        list = list.filter((c) => c.ward === ward);
      }
      if (typeof status === "string" && status !== "all") {
        list = list.filter((c) => c.status === status);
      }
      return res.json({ complaints: list });
    } catch {
      return res.json({ complaints: complaintsStore });
    }
  });

  app.post("/api/complaints", async (req, res) => {
    try {
      const body = req.body || {};
      if (!body.imageUrl || typeof body.imageUrl !== "string") {
        return res.status(400).json({ error: "Please upload a photograph of the waste before submitting." });
      }

      const newTicketNo = `WM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newComplaint: Complaint = {
        id: `cmp-${Date.now()}`,
        ticketNo: newTicketNo,
        title: body.title || "Waste Accumulation Reported",
        description: body.description || "Garbage accumulation reported by citizen.",
        garbageType: body.garbageType || "General Mixed Solid Waste",
        severity: body.severity || "Medium",
        address: body.address || "Local Street Address, India",
        ward: body.ward || "Local Municipal Ward",
        lat: Number.isFinite(Number(body.lat)) ? Number(body.lat) : 20.5937,
        lng: Number.isFinite(Number(body.lng)) ? Number(body.lng) : 78.9629,
        imageUrl: body.imageUrl,
        status: "pending",
        citizenId: body.citizenId || "usr-citizen-1",
        citizenName: body.citizenName || "Ananya Verma",
        citizenPhone: body.citizenPhone || "+91 99887 76655",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        priorityScore: typeof body.priorityScore === "number" ? body.priorityScore : 75,
        estimatedFillPercent: typeof body.estimatedFillPercent === "number" ? body.estimatedFillPercent : 80,
        ...(typeof body.gpsAccuracyMeters === "number" ? { gpsAccuracyMeters: body.gpsAccuracyMeters } : {}),
        ...(typeof body.isLiveGpsVerified === "boolean" ? { isLiveGpsVerified: body.isLiveGpsVerified } : {}),
        ...(typeof body.binTag === "string" && body.binTag.trim() ? { binTag: body.binTag.trim() } : {}),
        ...(body.aiAnalysis && typeof body.aiAnalysis === "object" ? { aiAnalysis: body.aiAnalysis } : {})
      };

      complaintsStore.unshift(newComplaint);

      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        userId: "usr-admin-1",
        role: "admin",
        title: "New Complaint Reported",
        message: `New ticket ${newTicketNo} (${newComplaint.severity} Priority) registered in ${newComplaint.ward}.`,
        timestamp: new Date().toISOString(),
        read: false,
        complaintId: newComplaint.id
      };
      notificationsStore.unshift(notif);

      if (isMongoConnected) {
        try {
          await ComplaintModel.create(newComplaint);
          await NotificationModel.create(notif);
        } catch (mErr) {
          console.error("MongoDB create complaint error:", mErr);
        }
      }

      return res.json({ success: true, complaint: newComplaint });
    } catch (err) {
      console.error("Create complaint error:", err);
      return res.status(500).json({ error: "Failed to create complaint." });
    }
  });

  app.post("/api/complaints/:id/assign", async (req, res) => {
    try {
      const { id } = req.params;
      const { workerId } = req.body || {};

      let worker = workersStore.find((w) => w.userId === workerId || w.id === workerId);
      if (!worker && isMongoConnected) {
        const dbW = await WorkerModel.findOne({ $or: [{ userId: workerId }, { id: workerId }] }).lean();
        if (dbW) worker = dbW as WorkerProfile;
      }

      let updatedComplaint: Complaint | null = null;
      const now = new Date().toISOString();

      const idx = complaintsStore.findIndex((c) => c.id === id);
      if (idx !== -1) {
        complaintsStore[idx] = {
          ...complaintsStore[idx],
          workerId: worker ? worker.userId : workerId,
          workerName: worker ? worker.name : "Assigned Field Officer",
          workerPhone: worker ? worker.phone : "+91 98223 11445",
          status: "assigned",
          assignedAt: now,
          updatedAt: now
        };
        updatedComplaint = complaintsStore[idx];
      }

      if (isMongoConnected) {
        const dbUpdated = await ComplaintModel.findOneAndUpdate(
          { id },
          {
            $set: {
              workerId: worker ? worker.userId : workerId,
              workerName: worker ? worker.name : "Assigned Field Officer",
              workerPhone: worker ? worker.phone : "+91 98223 11445",
              status: "assigned",
              assignedAt: now,
              updatedAt: now
            }
          },
          { new: true }
        ).lean();
        if (dbUpdated && !updatedComplaint) {
          updatedComplaint = dbUpdated as Complaint;
        }
      }

      if (!updatedComplaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      return res.json({ success: true, complaint: updatedComplaint });
    } catch {
      return res.status(500).json({ error: "Failed to assign worker" });
    }
  });

  app.put("/api/complaints/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, cleanedImageUrl, workerNotes } = req.body || {};

      const existing = complaintsStore.find((c) => c.id === id) ||
        (isMongoConnected ? ((await ComplaintModel.findOne({ id }).lean()) as Complaint | null) : null);

      const effectiveCleaned = cleanedImageUrl || existing?.cleanedImageUrl;
      if (status === "completed" && (!effectiveCleaned || !String(effectiveCleaned).trim())) {
        return res.status(400).json({
          error: "After-cleanup proof photograph is required before marking a job completed."
        });
      }

      const now = new Date().toISOString();
      const setFields: Record<string, any> = {
        status,
        updatedAt: now
      };
      if (cleanedImageUrl) setFields.cleanedImageUrl = cleanedImageUrl;
      if (workerNotes !== undefined) setFields.workerNotes = workerNotes;
      if (status === "completed" || status === "verified") {
        setFields.completedAt = existing?.completedAt || now;
      }

      let updatedComplaint: Complaint | null = null;
      const idx = complaintsStore.findIndex((c) => c.id === id);
      if (idx !== -1) {
        complaintsStore[idx] = { ...complaintsStore[idx], ...setFields };
        updatedComplaint = complaintsStore[idx];
      }

      if (isMongoConnected) {
        const dbUpdated = await ComplaintModel.findOneAndUpdate({ id }, { $set: setFields }, { new: true }).lean();
        if (dbUpdated) updatedComplaint = dbUpdated as Complaint;
      }

      if (!updatedComplaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      return res.json({ success: true, complaint: updatedComplaint });
    } catch {
      return res.status(500).json({ error: "Failed to update complaint status" });
    }
  });

  app.post("/api/complaints/:id/feedback", async (req, res) => {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body || {};
      const numRating = Number(rating);

      let updatedComplaint: Complaint | null = null;
      const idx = complaintsStore.findIndex((c) => c.id === id);
      if (idx !== -1) {
        complaintsStore[idx] = {
          ...complaintsStore[idx],
          feedbackRating: numRating,
          feedbackComment: comment || "",
          status: "verified",
          updatedAt: new Date().toISOString()
        };
        updatedComplaint = complaintsStore[idx];
      }

      if (isMongoConnected) {
        const dbUpdated = await ComplaintModel.findOneAndUpdate(
          { id },
          {
            $set: {
              feedbackRating: numRating,
              feedbackComment: comment || "",
              status: "verified",
              updatedAt: new Date().toISOString()
            }
          },
          { new: true }
        ).lean();
        if (dbUpdated) updatedComplaint = dbUpdated as Complaint;
      }

      if (!updatedComplaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      return res.json({ success: true, complaint: updatedComplaint });
    } catch {
      return res.status(500).json({ error: "Failed to save feedback" });
    }
  });

  // 3. Workers Management API
  app.get("/api/workers", async (_req, res) => {
    try {
      let list = [...workersStore];
      if (isMongoConnected) {
        const dbWorkers = await WorkerModel.find({}, { _id: 0, __v: 0 }).lean();
        if (dbWorkers && dbWorkers.length > 0) {
          list = dbWorkers as WorkerProfile[];
        }
      }
      return res.json({ workers: list });
    } catch {
      return res.json({ workers: workersStore });
    }
  });

  app.post("/api/workers", async (req, res) => {
    try {
      const { name, email, phone, ward, vehicleNo } = req.body || {};
      const newWorker: WorkerProfile = {
        id: `wk-${Date.now()}`,
        userId: `usr-worker-${Date.now()}`,
        name,
        email,
        phone: phone || "+91 98000 00000",
        ward: ward || "Ward 12 - Green Park",
        status: "active",
        totalAssigned: 0,
        totalResolved: 0,
        rating: 5.0,
        vehicleNo: vehicleNo || "MH-12-GW-COMPACTOR"
      };
      workersStore.push(newWorker);
      if (isMongoConnected) {
        try {
          await WorkerModel.create(newWorker);
        } catch (mErr) {
          console.error("MongoDB create worker error:", mErr);
        }
      }
      return res.json({ success: true, worker: newWorker });
    } catch {
      return res.status(500).json({ error: "Failed to create worker" });
    }
  });

  // 4. Dumpster Registry & QR Verification API (Hybrid MongoDB + In-Memory Store)
  app.get("/api/dumpsters", async (_req, res) => {
    try {
      let list = [...dumpstersStore];
      if (isMongoConnected) {
        const dbDumpsters = await DumpsterModel.find({}, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean();
        if (dbDumpsters && dbDumpsters.length > 0) {
          list = dbDumpsters as DumpsterBin[];
        }
      }
      return res.json({ dumpsters: list });
    } catch {
      return res.json({ dumpsters: dumpstersStore });
    }
  });

  app.post("/api/dumpsters", async (req, res) => {
    try {
      const { binId, ward, address, lat, lng, capacityLitres, dumpsterType } = req.body || {};
      if (!binId || typeof binId !== "string" || binId.trim().length < 3) {
        return res.status(400).json({ error: "A valid Dumpster Bin ID (min 3 characters) is required." });
      }
      if (!address || typeof address !== "string" || !address.trim()) {
        return res.status(400).json({ error: "Dumpster street address is required." });
      }

      const normalizedBinId = binId.trim().toUpperCase();
      const parsedLat = Number(lat);
      const parsedLng = Number(lng);
      if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        return res.status(400).json({ error: "Valid latitude and longitude coordinates are required." });
      }

      const duplicateMem = dumpstersStore.some((d) => d.binId.toUpperCase() === normalizedBinId);
      const duplicateDb = isMongoConnected
        ? await DumpsterModel.findOne({ binId: new RegExp(`^${escapeRegex(normalizedBinId)}$`, "i") }).lean()
        : null;
      if (duplicateMem || duplicateDb) {
        return res.status(409).json({ error: `Dumpster Bin ID "${normalizedBinId}" is already registered.` });
      }

      const newDumpster: DumpsterBin = {
        binId: normalizedBinId,
        ward: ward || "Ward 12 - Green Park",
        address: address.trim(),
        lat: parsedLat,
        lng: parsedLng,
        capacityLitres: Number(capacityLitres) || 1100,
        dumpsterType: dumpsterType || "Hydraulic Rear-Lift Dumpster",
        installedDate: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString()
      };

      dumpstersStore.unshift(newDumpster);
      if (isMongoConnected) {
        try {
          await DumpsterModel.create(newDumpster);
        } catch (mErr) {
          console.error("MongoDB create dumpster error:", mErr);
        }
      }
      return res.status(201).json({ success: true, dumpster: newDumpster });
    } catch (err) {
      console.error("Create dumpster error:", err);
      return res.status(500).json({ error: "Failed to register dumpster." });
    }
  });

  app.post("/api/dumpsters/verify", async (req, res) => {
    try {
      const { qrData } = req.body || {};
      if (!qrData || typeof qrData !== "string" || !qrData.trim()) {
        return res.status(400).json({ error: "QR code data is empty or unreadable." });
      }

      const raw = qrData.trim();

      // Explicitly reject unrelated non-bin QR formats (URLs, UPI payment QR, WiFi, vCards, phones, etc.)
      if (/^(https?:\/\/|upi:\/\/|WIFI:|BEGIN:VCARD|MATMSG:|mailto:|tel:|sms:)/i.test(raw)) {
        return res.status(400).json({
          error: "Invalid QR code: Only official Municipal Bin QR codes are supported. Payment, website, and other QR codes are rejected."
        });
      }

      let candidateBinId = "";
      let generatedStickerPayload: DumpsterBin | null = null;

      if (raw.startsWith("{")) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return res.status(400).json({
            error: "Invalid QR code: Corrupted JSON payload. Only municipal Bin QR stickers are supported."
          });
        }

        if (!parsed || typeof parsed !== "object" || typeof parsed.binId !== "string" || !parsed.binId.trim()) {
          return res.status(400).json({
            error: "Invalid QR code: Missing municipal Bin ID. Other QR codes are rejected."
          });
        }

        candidateBinId = parsed.binId.trim().toUpperCase();
        if (!/^BIN-[A-Z0-9-]{2,}$/i.test(candidateBinId)) {
          return res.status(400).json({
            error: `Invalid Bin QR format "${candidateBinId}". Bin IDs must follow BIN-... format.`
          });
        }

        const pLat = Number(parsed.lat);
        const pLng = Number(parsed.lng);
        const hasValidStickerFields =
          typeof parsed.address === "string" &&
          parsed.address.trim().length > 0 &&
          typeof parsed.ward === "string" &&
          parsed.ward.trim().length > 0 &&
          Number.isFinite(pLat) &&
          pLat >= -90 &&
          pLat <= 90 &&
          Number.isFinite(pLng) &&
          pLng >= -180 &&
          pLng <= 180;

        if (hasValidStickerFields) {
          generatedStickerPayload = {
            binId: candidateBinId,
            ward: parsed.ward.trim(),
            address: parsed.address.trim(),
            lat: pLat,
            lng: pLng,
            capacityLitres: Number(parsed.capacityLitres) || 1100,
            dumpsterType:
              typeof parsed.dumpsterType === "string" && parsed.dumpsterType.trim()
                ? parsed.dumpsterType.trim()
                : "Hydraulic Rear-Lift Dumpster",
            installedDate:
              typeof parsed.installedDate === "string" && parsed.installedDate.trim()
                ? parsed.installedDate.trim()
                : new Date().toISOString().split("T")[0],
            createdAt: new Date().toISOString()
          };
        }
      } else {
        // Plain-text Bin ID entry: must strictly follow municipal BIN-... format
        const cleaned = raw.toUpperCase();
        if (!/^BIN-[A-Z0-9-]{2,}$/.test(cleaned)) {
          return res.status(400).json({
            error: "Invalid QR code: Not a municipal Bin QR code. Only BIN-... tags are accepted."
          });
        }
        candidateBinId = cleaned;
      }

      let matched: any = null;
      if (isMongoConnected) {
        matched = await DumpsterModel.findOne(
          { binId: new RegExp(`^${escapeRegex(candidateBinId)}$`, "i") },
          { _id: 0, __v: 0 }
        ).lean();
      }
      if (!matched) {
        matched = dumpstersStore.find((d) => d.binId.toUpperCase() === candidateBinId) || null;
      }

      // If this was a valid sticker generated from our QR Tag Generator, auto-register & verify it
      if (!matched && generatedStickerPayload) {
        dumpstersStore.unshift(generatedStickerPayload);
        if (isMongoConnected) {
          try {
            await DumpsterModel.create(generatedStickerPayload);
          } catch (mErr) {
            console.error("MongoDB auto-register scanned bin error:", mErr);
          }
        }
        matched = generatedStickerPayload;
      }

      if (!matched) {
        return res.status(404).json({
          error: `Unregistered Bin QR: "${candidateBinId}" is not registered in the municipal bin registry.`
        });
      }
      return res.json({ success: true, dumpster: matched });
    } catch (err) {
      console.error("Dumpster verify error:", err);
      return res.status(500).json({ error: "Failed to verify dumpster QR." });
    }
  });

  // 4b. India Real-Time Reverse & Forward Geocoding (OpenStreetMap Nominatim)
  app.get("/api/location/reverse", async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: "Valid latitude and longitude coordinates are required." });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "CleanCitySmartWaste/1.0 (municipal-waste-monitoring)",
          "Accept-Language": "en"
        },
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Nominatim reverse HTTP ${response.status}`);
      }
      const data: any = await response.json();
      const addr = data?.address || {};
      const streetParts = [
        addr.house_number,
        addr.road || addr.pedestrian || addr.residential,
        addr.neighbourhood || addr.suburb || addr.quarter || addr.village || addr.hamlet,
        addr.city || addr.town || addr.state_district || addr.county,
        addr.state,
        addr.postcode,
        addr.country
      ].filter((p: any) => typeof p === "string" && p.trim().length > 0);

      const formattedAddress =
        streetParts.length > 0
          ? Array.from(new Set(streetParts)).join(", ")
          : data?.display_name || `GPS Fix (${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E)`;
      const wardSuggestion =
        addr.suburb || addr.neighbourhood || addr.town || addr.city || addr.state_district || "Local Area";

      return res.json({
        success: true,
        address: formattedAddress,
        city: addr.city || addr.town || addr.village || addr.state_district || "",
        state: addr.state || "",
        postcode: addr.postcode || "",
        country: addr.country || "",
        wardSuggestion,
        lat,
        lng,
        displayName: data?.display_name || formattedAddress
      });
    } catch (err) {
      console.error("Reverse geocode fallback:", err);
      return res.json({
        success: true,
        fallback: true,
        address: `GPS Location (${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E)`,
        wardSuggestion: "",
        lat,
        lng
      });
    } finally {
      clearTimeout(timeoutId);
    }
  });

  app.get("/api/location/geocode", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q || q.length < 3) {
      return res.status(400).json({ error: "Please enter at least 3 characters for your local Indian address." });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        q
      )}&countrycodes=in&addressdetails=1&limit=1`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "CleanCitySmartWaste/1.0 (municipal-waste-monitoring)",
          "Accept-Language": "en"
        },
        signal: controller.signal
      });
      if (!response.ok) {
        return res.status(502).json({ error: "Address lookup service temporarily unavailable." });
      }
      const results: any = await response.json();
      if (!Array.isArray(results) || results.length === 0) {
        return res.status(404).json({
          error: "Could not locate that address on the India map. Include your area/town/city and state or pincode."
        });
      }

      const top = results[0];
      const lat = Number(top.lat);
      const lng = Number(top.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(404).json({ error: "Geocoder returned invalid coordinates." });
      }

      const addr = top.address || {};
      const wardSuggestion =
        addr.suburb || addr.neighbourhood || addr.town || addr.city || addr.state_district || "";

      return res.json({
        success: true,
        lat,
        lng,
        displayName: top.display_name || q,
        city: addr.city || addr.town || addr.village || addr.state_district || "",
        state: addr.state || "",
        postcode: addr.postcode || "",
        wardSuggestion
      });
    } catch (err) {
      console.error("Forward geocode error:", err);
      return res.status(504).json({ error: "Address lookup timed out. You can still submit using your typed address." });
    } finally {
      clearTimeout(timeoutId);
    }
  });

  // 5. Admin Analytics Stats API
  app.get("/api/analytics", async (_req, res) => {
    try {
      let currentComplaints = complaintsStore;
      let currentWorkers = workersStore;
      if (isMongoConnected) {
        const dbComplaints = await ComplaintModel.find({}, { _id: 0, __v: 0 }).lean();
        if (dbComplaints && dbComplaints.length > 0) {
          currentComplaints = dbComplaints as Complaint[];
        }
        const dbWorkers = await WorkerModel.find({}, { _id: 0, __v: 0 }).lean();
        if (dbWorkers && dbWorkers.length > 0) {
          currentWorkers = dbWorkers as WorkerProfile[];
        }
      }

      const totalComplaints = currentComplaints.length;
      const pendingComplaints = currentComplaints.filter((c) => c.status === "pending").length;
      const inProgressComplaints = currentComplaints.filter((c) => c.status === "in_progress" || c.status === "assigned").length;
      const resolvedComplaints = currentComplaints.filter((c) => c.status === "completed" || c.status === "verified").length;

      let resolutionSumHours = 0;
      let resolutionSamples = 0;
      for (const c of currentComplaints) {
        if ((c.status === "completed" || c.status === "verified") && c.completedAt && c.createdAt) {
          const diffMs = new Date(c.completedAt).getTime() - new Date(c.createdAt).getTime();
          if (Number.isFinite(diffMs) && diffMs >= 0) {
            resolutionSumHours += diffMs / (1000 * 60 * 60);
            resolutionSamples += 1;
          }
        }
      }
      const avgResolutionHours = resolutionSamples > 0 ? parseFloat((resolutionSumHours / resolutionSamples).toFixed(1)) : 0;

      const wasteCounts: Record<string, number> = {};
      currentComplaints.forEach((c) => {
        wasteCounts[c.garbageType] = (wasteCounts[c.garbageType] || 0) + 1;
      });
      const wasteTypeDistribution = Object.keys(wasteCounts).map((name) => ({
        name,
        count: wasteCounts[name],
        percentage: totalComplaints > 0 ? Math.round((wasteCounts[name] / totalComplaints) * 100) : 0
      }));

      const wardCounts: Record<string, { count: number; resolved: number }> = {};
      currentComplaints.forEach((c) => {
        if (!wardCounts[c.ward]) wardCounts[c.ward] = { count: 0, resolved: 0 };
        wardCounts[c.ward].count += 1;
        if (c.status === "completed" || c.status === "verified") {
          wardCounts[c.ward].resolved += 1;
        }
      });
      const wardDistribution = Object.keys(wardCounts).map((ward) => ({
        ward: ward.replace("Ward ", "W-"),
        count: wardCounts[ward].count,
        resolved: wardCounts[ward].resolved
      }));

      const dayMap: Record<string, { reported: number; resolved: number }> = {};
      currentComplaints.forEach((c) => {
        const dateKey = (c.createdAt || "").slice(0, 10) || "Unknown";
        if (!dayMap[dateKey]) dayMap[dateKey] = { reported: 0, resolved: 0 };
        dayMap[dateKey].reported += 1;
        if (c.status === "completed" || c.status === "verified") {
          dayMap[dateKey].resolved += 1;
        }
      });
      const dailyTrends = Object.keys(dayMap)
        .sort()
        .slice(-7)
        .map((date) => ({
          date,
          reported: dayMap[date].reported,
          resolved: dayMap[date].resolved
        }));

      return res.json({
        stats: {
          totalComplaints,
          pendingComplaints,
          inProgressComplaints,
          resolvedComplaints,
          activeWorkers: currentWorkers.filter((w) => w.status === "active" || w.status === "busy").length,
          avgResolutionHours,
          wasteTypeDistribution,
          wardDistribution,
          dailyTrends
        }
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // 6. Real Gemini AI Multimodal Waste Vision Route (NO fake fallbacks; rejects non-waste images)
  app.post("/api/ai-analyze-waste", async (req, res) => {
    try {
      const { imageBase64 } = req.body || {};

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: "Gemini AI analysis is unavailable because GEMINI_API_KEY is not configured on the server."
        });
      }

      if (!imageBase64 || typeof imageBase64 !== "string" || !imageBase64.startsWith("data:image/")) {
        return res.status(400).json({
          error: "Please upload an image file from your device before running Gemini AI analysis."
        });
      }

      const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      if (!mimeMatch) {
        return res.status(400).json({ error: "Invalid image format. Please upload a PNG, JPEG, or WebP photo." });
      }
      const mimeType = mimeMatch[1];
      const base64Data = imageBase64.slice(mimeMatch[0].length);
      if (!base64Data || base64Data.length < 32) {
        return res.status(400).json({ error: "Uploaded image appears empty or corrupted." });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({ error: "Gemini AI client could not be initialized." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            },
            {
              text: `You are an expert AI Municipal Sanitation & Optical Waste Inspection Engineer.
Carefully examine the actual provided photograph.

Step 1 — Waste Relevance Check:
Determine whether the photograph genuinely contains solid waste, garbage, litter, overflowing public bins/dumpsters, illegal dumping, construction debris, discarded e-waste, organic refuse, or hazardous/medical waste in an actual waste scene.
Set "isWasteScene" to FALSE if the image shows unrelated subjects such as portraits/selfies/people without garbage dumping, pets/animals, clean streets/nature/landscapes, indoor rooms/food on plates/electronics in normal use, documents/screenshots, or ordinary unrelated objects.

Step 2 — Authentic Analysis:
If "isWasteScene" is FALSE: set "confidence" to your honest certainty (0-100) and explain briefly in "rejectionReason" what unrelated subject was observed.
If "isWasteScene" is TRUE: classify accurately based ONLY on what is visibly present in the image. Give your honest "confidence" score (0-100) — do NOT artificially inflate or force it into any fixed range.`
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isWasteScene: {
                type: Type.BOOLEAN,
                description: "True ONLY if the image genuinely shows waste, litter, garbage, debris, or an overflowing bin/dumpster."
              },
              rejectionReason: {
                type: Type.STRING,
                description: "If isWasteScene is false, briefly describe the unrelated content seen."
              },
              detectedType: {
                type: Type.STRING,
                description: "One of: Plastic & Recyclable, Bio-degradable / Organic, E-Waste / Electronics, Hazardous & Medical, Construction & Heavy, Overflowing Public Dumpster, General Mixed Solid Waste"
              },
              severity: {
                type: Type.STRING,
                description: "One of: Low, Medium, High, Critical"
              },
              hazardLevel: {
                type: Type.STRING,
                description: "One of: Safe, Moderate, Hazardous, Critical"
              },
              confidence: {
                type: Type.NUMBER,
                description: "Honest model confidence percentage from 0 to 100."
              },
              recyclablePercentage: {
                type: Type.NUMBER,
                description: "Estimated recyclable fraction percentage from 0 to 100."
              },
              estimatedVolume: {
                type: Type.STRING,
                description: "Visual volume estimate string, e.g. '0.45 m³ (Est.)'"
              },
              carbonOffsetKg: {
                type: Type.NUMBER,
                description: "Estimated CO2e offset in kg if properly recovered/recycled."
              },
              recommendedEquipment: {
                type: Type.STRING,
                description: "Appropriate municipal collection equipment & PPE."
              },
              estimatedFillPercent: {
                type: Type.NUMBER,
                description: "Estimated accumulation or bin fill percentage from 0 to 100."
              },
              recommendedPriority: {
                type: Type.NUMBER,
                description: "Dispatch priority score from 1 to 100."
              },
              aiAnalysisNotes: {
                type: Type.STRING,
                description: "Concise 1-2 sentence technical assessment based on visible evidence in the image."
              }
            },
            required: ["isWasteScene", "confidence", "aiAnalysisNotes"]
          }
        }
      });

      const rawText = response.text?.trim() || "";
      if (!rawText) {
        return res.status(502).json({
          error: "Gemini AI returned an empty response. Please try again with a clearer image."
        });
      }

      let parsed: any;
      try {
        const cleanedJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleanedJson);
      } catch {
        return res.status(502).json({
          error: "Gemini AI returned an unreadable response format. Please retry."
        });
      }

      if (parsed.isWasteScene !== true) {
        return res.status(422).json({
          error: "No relevant waste detected. Please upload a clear photograph of waste.",
          isRelevant: false,
          reason: parsed.rejectionReason || parsed.aiAnalysisNotes || ""
        });
      }

      const allowedTypes = [
        "Plastic & Recyclable",
        "Bio-degradable / Organic",
        "E-Waste / Electronics",
        "Hazardous & Medical",
        "Construction & Heavy",
        "Overflowing Public Dumpster",
        "General Mixed Solid Waste"
      ];
      const allowedSeverities = ["Low", "Medium", "High", "Critical"];
      const allowedHazards = ["Safe", "Moderate", "Hazardous", "Critical"];

      const safeConfidence = Number.isFinite(Number(parsed.confidence))
        ? Math.max(0, Math.min(100, Math.round(Number(parsed.confidence))))
        : 0;

      return res.json({
        isRelevant: true,
        detectedType: allowedTypes.includes(parsed.detectedType)
          ? parsed.detectedType
          : "General Mixed Solid Waste",
        severity: allowedSeverities.includes(parsed.severity) ? parsed.severity : "Medium",
        hazardLevel: allowedHazards.includes(parsed.hazardLevel) ? parsed.hazardLevel : "Moderate",
        confidence: safeConfidence,
        recyclablePercentage: Number.isFinite(Number(parsed.recyclablePercentage))
          ? Math.max(0, Math.min(100, Math.round(Number(parsed.recyclablePercentage))))
          : 0,
        estimatedVolume: parsed.estimatedVolume || "Visual Estimate Unavailable",
        carbonOffsetKg: Number.isFinite(Number(parsed.carbonOffsetKg))
          ? Number(Number(parsed.carbonOffsetKg).toFixed(1))
          : 0,
        recommendedEquipment: parsed.recommendedEquipment || "Standard Municipal Collection Vehicle",
        estimatedFillPercent: Number.isFinite(Number(parsed.estimatedFillPercent))
          ? Math.max(0, Math.min(100, Math.round(Number(parsed.estimatedFillPercent))))
          : 50,
        recommendedPriority: Number.isFinite(Number(parsed.recommendedPriority))
          ? Math.max(1, Math.min(100, Math.round(Number(parsed.recommendedPriority))))
          : 50,
        aiAnalysisNotes: parsed.aiAnalysisNotes || "Visual inspection completed."
      });
    } catch (err: any) {
      console.error("AI Waste Analysis Error:", err);
      const statusCode = err?.status || err?.code;
      const msg = String(err?.message || "");
      if (statusCode === 429 || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
        return res.status(429).json({
          error: "Gemini AI quota exceeded right now. Please try again later."
        });
      }
      if (statusCode === 401 || statusCode === 403 || msg.includes("API_KEY_INVALID") || msg.includes("PERMISSION_DENIED")) {
        return res.status(502).json({
          error: "Gemini AI authentication failed. Please verify the server GEMINI_API_KEY configuration."
        });
      }
      return res.status(502).json({
        error: "Gemini AI image analysis failed due to a service or network error. Please retry."
      });
    }
  });

  // Notifications API
  app.get("/api/notifications", async (req, res) => {
    try {
      const { userId } = req.query;
      let list = [...notificationsStore];
      if (isMongoConnected) {
        const dbNotifs = await NotificationModel.find({}, { _id: 0, __v: 0 }).sort({ timestamp: -1 }).lean();
        if (dbNotifs && dbNotifs.length > 0) {
          list = dbNotifs as AppNotification[];
        }
      }
      if (typeof userId === "string" && userId) {
        list = list.filter((n) => n.userId === userId);
      }
      return res.json({ notifications: list });
    } catch {
      return res.json({ notifications: notificationsStore });
    }
  });

  // VITE MIDDLEWARE SETUP
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Waste Cloud App Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

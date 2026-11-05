import { Request, Response, NextFunction } from "express";
import { db } from "../../config/firebase.js";
import { Vendor } from "@flowos/shared-types";

// In-Memory mock storage for offline/unreachable Firestore scenario
export const mockVendorsStore = new Map<string, Vendor[]>();

const seedDefaultVendors = (companyId: string): Vendor[] => {
  const defaults: Omit<Vendor, "id" | "companyId" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "isDeleted">[] = [
    {
      name: "Steel Corp India",
      email: "orders@steelcorp.in",
      phone: "+91 22 2456 7890",
      gstin: "27CCCCC3333C3Z3",
      pan: "CCCCC3333C",
      address: { street: "Plot 42, Industrial Area", city: "Mumbai", state: "Maharashtra", zip: "400012", country: "India" },
      rating: 4.8,
      leadTimeDays: 5,
      outstandingBalance: 60000,
      currencyCode: "INR"
    },
    {
      name: "Global Logic Chipsets",
      email: "supply@globallogic.com",
      phone: "+1 415 555 2678",
      address: { street: "500 Silicon Way", city: "San Jose", state: "California", zip: "95110", country: "USA" },
      rating: 4.5,
      leadTimeDays: 14,
      outstandingBalance: 0,
      currencyCode: "USD"
    }
  ];

  const seeded: Vendor[] = defaults.map((v, idx) => ({
    id: idx === 0 ? "vend_steel_corp" : `vend_seed_${idx + 1}`,
    ...v,
    companyId,
    createdAt: new Date(),
    createdBy: "system",
    updatedAt: new Date(),
    updatedBy: "system",
    isDeleted: false
  }));

  mockVendorsStore.set(companyId, seeded);
  return seeded;
};

export const getVendors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let vendors: Vendor[] = [];
    try {
      const snapshot = await db.collection("vendors").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      vendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching vendors from mock store.");
      if (!mockVendorsStore.has(companyId)) {
        seedDefaultVendors(companyId);
      }
      vendors = (mockVendorsStore.get(companyId) || []).filter(v => !v.isDeleted);
    }

    res.json({
      success: true,
      data: vendors,
      meta: { total: vendors.length },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let vendor: Vendor | null = null;
    try {
      const doc = await db.collection("vendors").doc(id).get();
      if (doc.exists && doc.data()?.companyId === companyId && !doc.data()?.isDeleted) {
        vendor = { id: doc.id, ...doc.data() } as Vendor;
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, retrieving vendor from mock store.");
      if (!mockVendorsStore.has(companyId)) {
        seedDefaultVendors(companyId);
      }
      const list = mockVendorsStore.get(companyId) || [];
      vendor = list.find(v => v.id === id && !v.isDeleted) || null;
    }

    if (!vendor) {
      res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Vendor not found." } });
      return;
    }

    res.json({ success: true, data: vendor, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

export const createVendor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const newVendorData: Omit<Vendor, "id"> = {
      ...req.body,
      companyId,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false,
      outstandingBalance: req.body.outstandingBalance || 0
    };

    let createdVendor: Vendor;
    try {
      const docRef = await db.collection("vendors").add(newVendorData);
      createdVendor = { id: docRef.id, ...newVendorData } as Vendor;
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, writing vendor to mock store.");
      const id = "vend_" + Math.random().toString(36).substring(2, 9);
      createdVendor = { id, ...newVendorData } as Vendor;
      const list = mockVendorsStore.get(companyId) || [];
      list.push(createdVendor);
      mockVendorsStore.set(companyId, list);
    }

    res.status(201).json({ success: true, data: createdVendor, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

export const updateVendor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    const { id } = req.params;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const updates = {
      ...req.body,
      updatedAt: new Date(),
      updatedBy: userId
    };

    let updatedVendor: Vendor | null = null;
    try {
      const docRef = db.collection("vendors").doc(id);
      const doc = await docRef.get();
      if (doc.exists && doc.data()?.companyId === companyId) {
        await docRef.update(updates);
        const finalDoc = await docRef.get();
        updatedVendor = { id: finalDoc.id, ...finalDoc.data() } as Vendor;
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, updating vendor in mock store.");
      const list = mockVendorsStore.get(companyId) || [];
      const index = list.findIndex(v => v.id === id && !v.isDeleted);
      if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        updatedVendor = list[index];
        mockVendorsStore.set(companyId, list);
      }
    }

    if (!updatedVendor) {
      res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Vendor not found or access denied." } });
      return;
    }

    res.json({ success: true, data: updatedVendor, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

export const deleteVendor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    const { id } = req.params;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let success = false;
    try {
      const docRef = db.collection("vendors").doc(id);
      const doc = await docRef.get();
      if (doc.exists && doc.data()?.companyId === companyId) {
        await docRef.update({ isDeleted: true, updatedAt: new Date(), updatedBy: userId });
        success = true;
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, soft-deleting vendor in mock store.");
      const list = mockVendorsStore.get(companyId) || [];
      const index = list.findIndex(v => v.id === id);
      if (index !== -1) {
        list[index].isDeleted = true;
        mockVendorsStore.set(companyId, list);
        success = true;
      }
    }

    if (!success) {
      res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Vendor not found or access denied." } });
      return;
    }

    res.json({ success: true, data: { id, message: "Vendor deleted successfully." }, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

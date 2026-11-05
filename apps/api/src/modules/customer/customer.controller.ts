import { Request, Response, NextFunction } from "express";
import { db } from "../../config/firebase.js";
import { Customer } from "@flowos/shared-types";

// In-Memory mock storage for offline/unreachable Firestore scenario
export const mockCustomersStore = new Map<string, Customer[]>();

const seedDefaultCustomers = (companyId: string): Customer[] => {
  const defaults: Omit<Customer, "id" | "companyId" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "isDeleted">[] = [
    {
      name: "Apex Labs Pvt Ltd",
      email: "billing@apexlabs.com",
      phone: "+91 98765 43210",
      gstin: "27AAAAA1111A1Z1",
      pan: "AAAAA1111A",
      billingAddress: { street: "101, Science Park", city: "Mumbai", state: "Maharashtra", zip: "400076", country: "India" },
      shippingAddress: { street: "101, Science Park", city: "Mumbai", state: "Maharashtra", zip: "400076", country: "India" },
      creditLimit: 500000,
      outstandingBalance: 15400,
      currencyCode: "INR"
    },
    {
      name: "Zenith Tech Solutions",
      email: "accounts@zenithtech.com",
      phone: "+91 99887 76655",
      gstin: "29BBBBB2222B2Z2",
      pan: "BBBBB2222B",
      billingAddress: { street: "402, Tech Corridor", city: "Bangalore", state: "Karnataka", zip: "560001", country: "India" },
      shippingAddress: { street: "402, Tech Corridor", city: "Bangalore", state: "Karnataka", zip: "560001", country: "India" },
      creditLimit: 1000000,
      outstandingBalance: 0,
      currencyCode: "INR"
    }
  ];

  const seeded: Customer[] = defaults.map((c, idx) => ({
    id: `cust_seed_${idx + 1}`,
    ...c,
    companyId,
    createdAt: new Date(),
    createdBy: "system",
    updatedAt: new Date(),
    updatedBy: "system",
    isDeleted: false
  }));

  mockCustomersStore.set(companyId, seeded);
  return seeded;
};

export const getCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let customers: Customer[] = [];
    try {
      const snapshot = await db.collection("customers").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching customers from mock store.");
      if (!mockCustomersStore.has(companyId)) {
        seedDefaultCustomers(companyId);
      }
      customers = (mockCustomersStore.get(companyId) || []).filter(c => !c.isDeleted);
    }

    res.json({
      success: true,
      data: customers,
      meta: { total: customers.length },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let customer: Customer | null = null;
    try {
      const doc = await db.collection("customers").doc(id).get();
      if (doc.exists && doc.data()?.companyId === companyId && !doc.data()?.isDeleted) {
        customer = { id: doc.id, ...doc.data() } as Customer;
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, retrieving customer from mock store.");
      if (!mockCustomersStore.has(companyId)) {
        seedDefaultCustomers(companyId);
      }
      const list = mockCustomersStore.get(companyId) || [];
      customer = list.find(c => c.id === id && !c.isDeleted) || null;
    }

    if (!customer) {
      res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Customer not found." } });
      return;
    }

    res.json({ success: true, data: customer, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const newCustomerData: Omit<Customer, "id"> = {
      ...req.body,
      companyId,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false,
      outstandingBalance: req.body.outstandingBalance || 0
    };

    let createdCustomer: Customer;
    try {
      const docRef = await db.collection("customers").add(newCustomerData);
      createdCustomer = { id: docRef.id, ...newCustomerData } as Customer;
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, writing customer to mock store.");
      const id = "cust_" + Math.random().toString(36).substring(2, 9);
      createdCustomer = { id, ...newCustomerData } as Customer;
      const list = mockCustomersStore.get(companyId) || [];
      list.push(createdCustomer);
      mockCustomersStore.set(companyId, list);
    }

    res.status(201).json({ success: true, data: createdCustomer, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    let updatedCustomer: Customer | null = null;
    try {
      const docRef = db.collection("customers").doc(id);
      const doc = await docRef.get();
      if (doc.exists && doc.data()?.companyId === companyId) {
        await docRef.update(updates);
        const finalDoc = await docRef.get();
        updatedCustomer = { id: finalDoc.id, ...finalDoc.data() } as Customer;
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, updating customer in mock store.");
      const list = mockCustomersStore.get(companyId) || [];
      const index = list.findIndex(c => c.id === id && !c.isDeleted);
      if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        updatedCustomer = list[index];
        mockCustomersStore.set(companyId, list);
      }
    }

    if (!updatedCustomer) {
      res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Customer not found or access denied." } });
      return;
    }

    res.json({ success: true, data: updatedCustomer, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      const docRef = db.collection("customers").doc(id);
      const doc = await docRef.get();
      if (doc.exists && doc.data()?.companyId === companyId) {
        await docRef.update({ isDeleted: true, updatedAt: new Date(), updatedBy: userId });
        success = true;
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, soft-deleting customer in mock store.");
      const list = mockCustomersStore.get(companyId) || [];
      const index = list.findIndex(c => c.id === id);
      if (index !== -1) {
        list[index].isDeleted = true;
        mockCustomersStore.set(companyId, list);
        success = true;
      }
    }

    if (!success) {
      res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Customer not found or access denied." } });
      return;
    }

    res.json({ success: true, data: { id, message: "Customer deleted successfully." }, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

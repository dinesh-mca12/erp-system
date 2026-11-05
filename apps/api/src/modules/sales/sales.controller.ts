import { Request, Response, NextFunction } from "express";
import { db } from "../../config/firebase.js";
import admin from "../../config/firebase.js";
import { Invoice, SalesOrder, RetainerInvoice, CreditNote } from "@flowos/shared-types";
import { mockCustomersStore } from "../customer/customer.controller.js";
import { mockProductsStore } from "../product/product.controller.js";

// Fallback in-memory mock stores for offline mode
export const mockInvoicesStore = new Map<string, Invoice[]>();
export const mockSalesOrdersStore = new Map<string, SalesOrder[]>();
export const mockRetainerInvoicesStore = new Map<string, RetainerInvoice[]>();
export const mockCreditNotesStore = new Map<string, CreditNote[]>();

const seedDefaultSales = (companyId: string) => {
  if (!mockInvoicesStore.has(companyId)) {
    mockInvoicesStore.set(companyId, [
      {
        id: "inv_seed_1",
        companyId,
        invoiceNumber: "INV-2026-0001",
        customerId: "cust_seed_1",
        items: [
          { productId: "prod_composite_kit", description: "Composite Server Assembly Kit", quantity: 2, unitPrice: 120000, taxRate: 18, lineTotal: 240000 }
        ],
        subTotal: 240000,
        taxAmount: 43200,
        discount: 0,
        grandTotal: 283200,
        amountPaid: 0,
        amountDue: 283200,
        status: "sent",
        gstDetails: { gstin: "27AAAAA1111A1Z1", cgst: 21600, sgst: 21600, igst: 0 },
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        currencyCode: "INR",
        exchangeRate: 1,
        baseCurrencyAmount: 283200,
        createdAt: new Date(),
        createdBy: "system",
        updatedAt: new Date(),
        updatedBy: "system",
        isDeleted: false
      }
    ]);
  }
  if (!mockSalesOrdersStore.has(companyId)) {
    mockSalesOrdersStore.set(companyId, [
      {
        id: "so_seed_1",
        companyId,
        orderNumber: "SO-2026-0001",
        customerId: "cust_seed_1",
        items: [
          { productId: "prod_composite_kit", description: "Composite Server Assembly Kit", quantity: 5, unitPrice: 120000, taxRate: 18, lineTotal: 600000 }
        ],
        subTotal: 600000,
        taxAmount: 108000,
        discount: 0,
        grandTotal: 708000,
        status: "approved",
        deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currencyCode: "INR",
        exchangeRate: 1,
        baseCurrencyAmount: 708000,
        createdAt: new Date(),
        createdBy: "system",
        updatedAt: new Date(),
        updatedBy: "system",
        isDeleted: false
      }
    ]);
  }
};

// ==========================================
// INVOICES
// ==========================================
export const getInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let invoices: Invoice[] = [];
    try {
      const snapshot = await db.collection("invoices").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching invoices from mock store.");
      seedDefaultSales(companyId);
      invoices = (mockInvoicesStore.get(companyId) || []).filter(i => !i.isDeleted);
    }

    res.json({ success: true, data: invoices, meta: { total: invoices.length }, error: null });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let invoice: Invoice | null = null;
    try {
      const doc = await db.collection("invoices").doc(id).get();
      if (doc.exists && doc.data()?.companyId === companyId && !doc.data()?.isDeleted) {
        invoice = { id: doc.id, ...doc.data() } as Invoice;
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching invoice from mock store.");
      seedDefaultSales(companyId);
      const list = mockInvoicesStore.get(companyId) || [];
      invoice = list.find(i => i.id === id && !i.isDeleted) || null;
    }

    if (!invoice) {
      res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Invoice not found." } });
      return;
    }

    res.json({ success: true, data: invoice, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    const userName = req.user?.email || "Admin User";
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const newInvoiceData: Omit<Invoice, "id"> = {
      ...req.body,
      companyId,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false,
    };

    let createdInvoice: Invoice;
    try {
      // 1. Save invoice in Firestore
      const docRef = await db.collection("invoices").add(newInvoiceData);
      createdInvoice = { id: docRef.id, ...newInvoiceData } as Invoice;

      // 2. Adjust product stock levels in Firestore
      for (const item of newInvoiceData.items) {
        const productRef = db.collection("products").doc(item.productId);
        const prodDoc = await productRef.get();
        if (prodDoc.exists) {
          await productRef.update({
            openingStock: admin.firestore.FieldValue.increment(-item.quantity)
          });
        }
      }

      // 3. Update customer outstanding balance in Firestore
      const customerRef = db.collection("customers").doc(newInvoiceData.customerId);
      const custDoc = await customerRef.get();
      if (custDoc.exists) {
        await customerRef.update({
          outstandingBalance: admin.firestore.FieldValue.increment(newInvoiceData.grandTotal - newInvoiceData.amountPaid)
        });
      }

      // 4. Log system activity event
      await db.collection("activity_logs").add({
        companyId,
        userId,
        userName,
        module: "sales",
        action: "create",
        description: `Created Invoice ${newInvoiceData.invoiceNumber} for ₹${newInvoiceData.grandTotal}`,
        createdAt: new Date()
      });

    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, writing invoice to mock store.");
      const id = "inv_" + Math.random().toString(36).substring(2, 9);
      createdInvoice = { id, ...newInvoiceData } as Invoice;

      // Update mock storage
      const list = mockInvoicesStore.get(companyId) || [];
      list.push(createdInvoice);
      mockInvoicesStore.set(companyId, list);

      // Decrement stock in mock store
      const pList = mockProductsStore.get(companyId) || [];
      for (const item of newInvoiceData.items) {
        const product = pList.find(p => p.id === item.productId);
        if (product) {
          product.openingStock = Math.max(0, product.openingStock - item.quantity);
        }
      }
      mockProductsStore.set(companyId, pList);

      // Increment customer outstanding balance in mock store
      const cList = mockCustomersStore.get(companyId) || [];
      const customer = cList.find(c => c.id === newInvoiceData.customerId);
      if (customer) {
        customer.outstandingBalance = (customer.outstandingBalance || 0) + (newInvoiceData.grandTotal - newInvoiceData.amountPaid);
      }
      mockCustomersStore.set(companyId, cList);
    }

    res.status(201).json({ success: true, data: createdInvoice, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

export const recordInvoicePayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    const userName = req.user?.email || "Admin User";
    const { id } = req.params;
    const { amountPaid } = req.body;

    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let updatedInvoice: Invoice | null = null;
    try {
      const invoiceRef = db.collection("invoices").doc(id);
      const doc = await invoiceRef.get();
      if (doc.exists && doc.data()?.companyId === companyId && !doc.data()?.isDeleted) {
        const inv = doc.data() as Invoice;
        const newAmountPaid = (inv.amountPaid || 0) + amountPaid;
        const newAmountDue = Math.max(0, inv.grandTotal - newAmountPaid);
        const newStatus = newAmountDue === 0 ? "paid" : "partially_paid";

        const updates = {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newStatus,
          updatedAt: new Date(),
          updatedBy: userId
        };

        await invoiceRef.update(updates);

        // Update customer outstanding balance
        const customerRef = db.collection("customers").doc(inv.customerId);
        const custDoc = await customerRef.get();
        if (custDoc.exists) {
          await customerRef.update({
            outstandingBalance: admin.firestore.FieldValue.increment(-amountPaid)
          });
        }

        // Log system activity event
        await db.collection("activity_logs").add({
          companyId,
          userId,
          userName,
          module: "sales",
          action: "edit",
          description: `Recorded payment of ₹${amountPaid} for Invoice ${inv.invoiceNumber}`,
          createdAt: new Date()
        });

        updatedInvoice = { ...inv, ...updates, id } as Invoice;
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, recording payment in mock store.");
      const list = mockInvoicesStore.get(companyId) || [];
      const index = list.findIndex(i => i.id === id && !i.isDeleted);
      if (index !== -1) {
        const inv = list[index];
        const newAmountPaid = (inv.amountPaid || 0) + amountPaid;
        const newAmountDue = Math.max(0, inv.grandTotal - newAmountPaid);
        const newStatus = newAmountDue === 0 ? "paid" : "partially_paid";

        list[index] = {
          ...inv,
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newStatus,
          updatedAt: new Date(),
          updatedBy: userId
        };
        updatedInvoice = list[index];
        mockInvoicesStore.set(companyId, list);

        // Decrement customer outstanding balance in mock store
        const cList = mockCustomersStore.get(companyId) || [];
        const customer = cList.find(c => c.id === inv.customerId);
        if (customer) {
          customer.outstandingBalance = Math.max(0, (customer.outstandingBalance || 0) - amountPaid);
        }
        mockCustomersStore.set(companyId, cList);
      }
    }

    if (!updatedInvoice) {
      res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Invoice not found or access denied." } });
      return;
    }

    res.json({ success: true, data: updatedInvoice, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SALES ORDERS
// ==========================================
export const getSalesOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let orders: SalesOrder[] = [];
    try {
      const snapshot = await db.collection("sales_orders").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesOrder));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching sales orders from mock store.");
      seedDefaultSales(companyId);
      orders = (mockSalesOrdersStore.get(companyId) || []).filter(o => !o.isDeleted);
    }

    res.json({ success: true, data: orders, meta: { total: orders.length }, error: null });
  } catch (error) {
    next(error);
  }
};

export const createSalesOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    const userName = req.user?.email || "Admin User";
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const newOrderData: Omit<SalesOrder, "id"> = {
      ...req.body,
      companyId,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false,
    };

    let createdOrder: SalesOrder;
    try {
      const docRef = await db.collection("sales_orders").add(newOrderData);
      createdOrder = { id: docRef.id, ...newOrderData } as SalesOrder;

      // Log system activity event
      await db.collection("activity_logs").add({
        companyId,
        userId,
        userName,
        module: "sales",
        action: "create",
        description: `Created Sales Order ${newOrderData.orderNumber} for ₹${newOrderData.grandTotal}`,
        createdAt: new Date()
      });
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, writing sales order to mock store.");
      const id = "so_" + Math.random().toString(36).substring(2, 9);
      createdOrder = { id, ...newOrderData } as SalesOrder;

      const list = mockSalesOrdersStore.get(companyId) || [];
      list.push(createdOrder);
      mockSalesOrdersStore.set(companyId, list);
    }

    res.status(201).json({ success: true, data: createdOrder, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// RETAINER INVOICES
// ==========================================
export const getRetainerInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let retainers: RetainerInvoice[] = [];
    try {
      const snapshot = await db.collection("retainer_invoices").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      retainers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RetainerInvoice));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching retainer invoices from mock store.");
      retainers = (mockRetainerInvoicesStore.get(companyId) || []).filter(r => !r.isDeleted);
    }

    res.json({ success: true, data: retainers, meta: { total: retainers.length }, error: null });
  } catch (error) {
    next(error);
  }
};

export const createRetainerInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const newRetainerData: Omit<RetainerInvoice, "id"> = {
      ...req.body,
      companyId,
      amountApplied: 0,
      status: "unapplied",
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false,
    };

    let createdRetainer: RetainerInvoice;
    try {
      const docRef = await db.collection("retainer_invoices").add(newRetainerData);
      createdRetainer = { id: docRef.id, ...newRetainerData } as RetainerInvoice;

      // Update customer outstanding balance (add deposit)
      const customerRef = db.collection("customers").doc(newRetainerData.customerId);
      const custDoc = await customerRef.get();
      if (custDoc.exists) {
        await customerRef.update({
          outstandingBalance: admin.firestore.FieldValue.increment(-newRetainerData.amount) // acts as credit
        });
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, writing retainer to mock store.");
      const id = "ret_" + Math.random().toString(36).substring(2, 9);
      createdRetainer = { id, ...newRetainerData } as RetainerInvoice;

      const list = mockRetainerInvoicesStore.get(companyId) || [];
      list.push(createdRetainer);
      mockRetainerInvoicesStore.set(companyId, list);

      // Apply credit in mock store
      const cList = mockCustomersStore.get(companyId) || [];
      const customer = cList.find(c => c.id === newRetainerData.customerId);
      if (customer) {
        customer.outstandingBalance = (customer.outstandingBalance || 0) - newRetainerData.amount;
      }
      mockCustomersStore.set(companyId, cList);
    }

    res.status(201).json({ success: true, data: createdRetainer, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CREDIT NOTES
// ==========================================
export const getCreditNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let creditNotes: CreditNote[] = [];
    try {
      const snapshot = await db.collection("credit_notes").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      creditNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditNote));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching credit notes from mock store.");
      creditNotes = (mockCreditNotesStore.get(companyId) || []).filter(cn => !cn.isDeleted);
    }

    res.json({ success: true, data: creditNotes, meta: { total: creditNotes.length }, error: null });
  } catch (error) {
    next(error);
  }
};

export const createCreditNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const newCreditNoteData: Omit<CreditNote, "id"> = {
      ...req.body,
      companyId,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false,
    };

    let createdCreditNote: CreditNote;
    try {
      const docRef = await db.collection("credit_notes").add(newCreditNoteData);
      createdCreditNote = { id: docRef.id, ...newCreditNoteData } as CreditNote;

      // Update customer outstanding balance (reduce by credit note value)
      const customerRef = db.collection("customers").doc(newCreditNoteData.customerId);
      const custDoc = await customerRef.get();
      if (custDoc.exists) {
        await customerRef.update({
          outstandingBalance: admin.firestore.FieldValue.increment(-newCreditNoteData.amount)
        });
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, writing credit note to mock store.");
      const id = "cn_" + Math.random().toString(36).substring(2, 9);
      createdCreditNote = { id, ...newCreditNoteData } as CreditNote;

      const list = mockCreditNotesStore.get(companyId) || [];
      list.push(createdCreditNote);
      mockCreditNotesStore.set(companyId, list);

      // Decrement customer outstanding balance in mock store
      const cList = mockCustomersStore.get(companyId) || [];
      const customer = cList.find(c => c.id === newCreditNoteData.customerId);
      if (customer) {
        customer.outstandingBalance = (customer.outstandingBalance || 0) - newCreditNoteData.amount;
      }
      mockCustomersStore.set(companyId, cList);
    }

    res.status(201).json({ success: true, data: createdCreditNote, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

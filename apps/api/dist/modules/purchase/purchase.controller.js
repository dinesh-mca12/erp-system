import { db } from "../../config/firebase.js";
import admin from "../../config/firebase.js";
import { mockVendorsStore } from "../vendor/vendor.controller.js";
import { mockProductsStore } from "../product/product.controller.js";
// Fallback in-memory mock stores for offline mode
export const mockPurchaseOrdersStore = new Map();
export const mockBillsStore = new Map();
const seedDefaultPurchases = (companyId) => {
    if (!mockPurchaseOrdersStore.has(companyId)) {
        mockPurchaseOrdersStore.set(companyId, [
            {
                id: "po_seed_1",
                companyId,
                orderNumber: "PO-2026-0001",
                vendorId: "vend_steel_corp",
                items: [
                    { productId: "prod_seed_1", description: "TMT Steel Bar Fe550", quantity: 10, unitPrice: 52000, taxRate: 18, lineTotal: 520000 }
                ],
                subTotal: 520000,
                taxAmount: 93600,
                discount: 0,
                grandTotal: 613600,
                status: "approved",
                expectedDeliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                currencyCode: "INR",
                exchangeRate: 1,
                baseCurrencyAmount: 613600,
                createdAt: new Date(),
                createdBy: "system",
                updatedAt: new Date(),
                updatedBy: "system",
                isDeleted: false
            }
        ]);
    }
    if (!mockBillsStore.has(companyId)) {
        mockBillsStore.set(companyId, [
            {
                id: "bill_seed_1",
                companyId,
                billNumber: "BILL-2026-0001",
                vendorId: "vend_steel_corp",
                items: [
                    { productId: "prod_seed_1", description: "TMT Steel Bar Fe550", quantity: 5, unitPrice: 52000, taxRate: 18, lineTotal: 260000 }
                ],
                subTotal: 260000,
                taxAmount: 46800,
                discount: 0,
                grandTotal: 306800,
                amountPaid: 0,
                amountDue: 306800,
                status: "unpaid",
                dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
                currencyCode: "INR",
                exchangeRate: 1,
                baseCurrencyAmount: 306800,
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
// PURCHASE ORDERS
// ==========================================
export const getPurchaseOrders = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let orders = [];
        try {
            const snapshot = await db.collection("purchase_orders").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
            orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, fetching purchase orders from mock store.");
            seedDefaultPurchases(companyId);
            orders = (mockPurchaseOrdersStore.get(companyId) || []).filter(o => !o.isDeleted);
        }
        res.json({ success: true, data: orders, meta: { total: orders.length }, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const createPurchaseOrder = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "system";
        const userName = req.user?.email || "Admin User";
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        const newOrderData = {
            ...req.body,
            companyId,
            createdAt: new Date(),
            createdBy: userId,
            updatedAt: new Date(),
            updatedBy: userId,
            isDeleted: false,
        };
        let createdOrder;
        try {
            const docRef = await db.collection("purchase_orders").add(newOrderData);
            createdOrder = { id: docRef.id, ...newOrderData };
            // Log activity
            await db.collection("activity_logs").add({
                companyId,
                userId,
                userName,
                module: "purchase",
                action: "create",
                description: `Created Purchase Order ${newOrderData.orderNumber} for ₹${newOrderData.grandTotal}`,
                createdAt: new Date()
            });
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, writing purchase order to mock store.");
            const id = "po_" + Math.random().toString(36).substring(2, 9);
            createdOrder = { id, ...newOrderData };
            const list = mockPurchaseOrdersStore.get(companyId) || [];
            list.push(createdOrder);
            mockPurchaseOrdersStore.set(companyId, list);
        }
        res.status(201).json({ success: true, data: createdOrder, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
// ==========================================
// BILLS (VENDOR INVOICES)
// ==========================================
export const getBills = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let bills = [];
        try {
            const snapshot = await db.collection("bills").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
            bills = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, fetching bills from mock store.");
            seedDefaultPurchases(companyId);
            bills = (mockBillsStore.get(companyId) || []).filter(b => !b.isDeleted);
        }
        res.json({ success: true, data: bills, meta: { total: bills.length }, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const createBill = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "system";
        const userName = req.user?.email || "Admin User";
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        const newBillData = {
            ...req.body,
            companyId,
            createdAt: new Date(),
            createdBy: userId,
            updatedAt: new Date(),
            updatedBy: userId,
            isDeleted: false,
        };
        let createdBill;
        try {
            // 1. Create Bill in Firestore
            const docRef = await db.collection("bills").add(newBillData);
            createdBill = { id: docRef.id, ...newBillData };
            // 2. Increment stock in Firestore
            for (const item of newBillData.items) {
                const productRef = db.collection("products").doc(item.productId);
                const prodDoc = await productRef.get();
                if (prodDoc.exists) {
                    await productRef.update({
                        openingStock: admin.firestore.FieldValue.increment(item.quantity)
                    });
                }
            }
            // 3. Update vendor outstanding balance in Firestore
            const vendorRef = db.collection("vendors").doc(newBillData.vendorId);
            const vendDoc = await vendorRef.get();
            if (vendDoc.exists) {
                await vendorRef.update({
                    outstandingBalance: admin.firestore.FieldValue.increment(newBillData.grandTotal - newBillData.amountPaid)
                });
            }
            // 4. Log system activity
            await db.collection("activity_logs").add({
                companyId,
                userId,
                userName,
                module: "purchase",
                action: "create",
                description: `Created Bill ${newBillData.billNumber} for ₹${newBillData.grandTotal}`,
                createdAt: new Date()
            });
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, writing bill to mock store.");
            const id = "bill_" + Math.random().toString(36).substring(2, 9);
            createdBill = { id, ...newBillData };
            // Update mock list
            const list = mockBillsStore.get(companyId) || [];
            list.push(createdBill);
            mockBillsStore.set(companyId, list);
            // Increment stock in mock store
            const pList = mockProductsStore.get(companyId) || [];
            for (const item of newBillData.items) {
                const product = pList.find(p => p.id === item.productId);
                if (product) {
                    product.openingStock = (product.openingStock || 0) + item.quantity;
                }
            }
            mockProductsStore.set(companyId, pList);
            // Increment vendor outstanding balance in mock store
            const vList = mockVendorsStore.get(companyId) || [];
            const vendor = vList.find(v => v.id === newBillData.vendorId);
            if (vendor) {
                vendor.outstandingBalance = (vendor.outstandingBalance || 0) + (newBillData.grandTotal - newBillData.amountPaid);
            }
            mockVendorsStore.set(companyId, vList);
        }
        res.status(201).json({ success: true, data: createdBill, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=purchase.controller.js.map
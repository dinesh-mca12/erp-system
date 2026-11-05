import { db } from "../../config/firebase.js";
import admin from "../../config/firebase.js";
import { mockProductsStore } from "../product/product.controller.js";
// Fallback in-memory mock stores for offline mode
export const mockWarehousesStore = new Map();
export const mockStockAdjustmentsStore = new Map();
export const mockStockTransfersStore = new Map();
// Seeding Default Warehouses if empty
export const seedDefaultWarehouses = (companyId) => {
    const defaults = [
        { name: "Mumbai Central Warehouse", location: "Andheri East, Mumbai", code: "WH-MUM-01", isDefault: false },
        { name: "Bangalore Logistics Hub", location: "Whitefield, Bangalore", code: "WH-BLR-02", isDefault: false }
    ];
    const seeded = defaults.map((wh, idx) => ({
        id: `wh_seed_${idx + 1}`,
        ...wh,
        companyId,
        createdAt: new Date(),
        createdBy: "system",
        updatedAt: new Date(),
        updatedBy: "system",
        isDeleted: false
    }));
    mockWarehousesStore.set(companyId, seeded);
    return seeded;
};
export const getWarehouses = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let warehouses = [];
        try {
            const snapshot = await db.collection("warehouses").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
            warehouses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, fetching warehouses from mock store.");
        }
        if (warehouses.length === 0) {
            if (!mockWarehousesStore.has(companyId)) {
                seedDefaultWarehouses(companyId);
            }
            warehouses = (mockWarehousesStore.get(companyId) || []).filter(w => !w.isDeleted);
        }
        res.json({ success: true, data: warehouses, meta: { total: warehouses.length }, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const createWarehouse = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "system";
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        const newWh = {
            ...req.body,
            companyId,
            createdAt: new Date(),
            createdBy: userId,
            updatedAt: new Date(),
            updatedBy: userId,
            isDeleted: false,
        };
        let created;
        try {
            const docRef = await db.collection("warehouses").add(newWh);
            created = { id: docRef.id, ...newWh };
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, writing warehouse to mock store.");
            const id = "wh_" + Math.random().toString(36).substring(2, 9);
            created = { id, ...newWh };
            const list = mockWarehousesStore.get(companyId) || [];
            list.push(created);
            mockWarehousesStore.set(companyId, list);
        }
        res.status(201).json({ success: true, data: created, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const adjustStock = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "system";
        const userName = req.user?.email || "Admin User";
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        const { warehouseId, productId, type, quantity, reason } = req.body;
        const newAdjustment = {
            ...req.body,
            companyId,
            createdAt: new Date(),
            createdBy: userId,
            updatedAt: new Date(),
            updatedBy: userId,
            isDeleted: false,
        };
        let created;
        try {
            const docRef = await db.collection("stock_adjustments").add(newAdjustment);
            created = { id: docRef.id, ...newAdjustment };
            // Update product overall stock count
            const qtyDiff = type === "increment" ? quantity : -quantity;
            await db.collection("products").doc(productId).update({
                openingStock: admin.firestore.FieldValue.increment(qtyDiff)
            });
            // Log system activity
            await db.collection("activity_logs").add({
                companyId,
                userId,
                userName,
                module: "inventory",
                action: "edit",
                description: `Manual stock adjustment for Product ID: ${productId} (${qtyDiff > 0 ? "+" : ""}${qtyDiff} units. Reason: ${reason})`,
                createdAt: new Date()
            });
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, executing adjustment in mock store.");
            const id = "adj_" + Math.random().toString(36).substring(2, 9);
            created = { id, ...newAdjustment };
            const list = mockStockAdjustmentsStore.get(companyId) || [];
            list.push(created);
            mockStockAdjustmentsStore.set(companyId, list);
            // Adjust mock products stock
            const pList = mockProductsStore.get(companyId) || [];
            const prod = pList.find(p => p.id === productId);
            if (prod) {
                prod.openingStock = (prod.openingStock || 0) + (type === "increment" ? quantity : -quantity);
            }
            mockProductsStore.set(companyId, pList);
        }
        res.status(201).json({ success: true, data: created, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const transferStock = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "system";
        const userName = req.user?.email || "Admin User";
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        const { sourceWarehouseId, targetWarehouseId, productId, quantity } = req.body;
        const newTransfer = {
            ...req.body,
            companyId,
            createdAt: new Date(),
            createdBy: userId,
            updatedAt: new Date(),
            updatedBy: userId,
            isDeleted: false,
        };
        let created;
        try {
            const docRef = await db.collection("stock_transfers").add(newTransfer);
            created = { id: docRef.id, ...newTransfer };
            // Log system activity (Stock relocations do not change overall company-wide quantities, just logs movement)
            await db.collection("activity_logs").add({
                companyId,
                userId,
                userName,
                module: "inventory",
                action: "edit",
                description: `Transferred ${quantity} units of Product ${productId} from Warehouse ${sourceWarehouseId} to ${targetWarehouseId}`,
                createdAt: new Date()
            });
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, logging transfer in mock store.");
            const id = "trans_" + Math.random().toString(36).substring(2, 9);
            created = { id, ...newTransfer };
            const list = mockStockTransfersStore.get(companyId) || [];
            list.push(created);
            mockStockTransfersStore.set(companyId, list);
        }
        res.status(201).json({ success: true, data: created, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=inventory.controller.js.map
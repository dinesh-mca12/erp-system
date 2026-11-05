import { db } from "../../config/firebase.js";
import { mockPurchaseOrdersStore } from "../purchase/purchase.controller.js";
// Fallback mock stores
export const mockSuggestionsStore = new Map();
export const mockActivitiesStore = new Map();
export const getDashboardSummary = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            res.status(400).json({
                success: false,
                data: null,
                error: { code: "BAD_REQUEST", message: "Company ID is missing from session." },
            });
            return;
        }
        // 1. Fetch pre-aggregated DashboardSummary document
        let summaryData = null;
        try {
            const summaryDoc = await db.collection("dashboard_summaries").doc(companyId).get();
            if (summaryDoc.exists) {
                summaryData = summaryDoc.data();
            }
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore unavailable, using mock fallback summary data.");
        }
        // Default fallback summary if not created yet or if db is offline
        if (!summaryData) {
            summaryData = {
                companyId,
                cashPosition: 1450000,
                overdueReceivables: { count: 3, amount: 48000 },
                overduePayables: { count: 2, amount: 18500 },
                pendingApprovals: 5,
                lowStockCount: 4,
                healthScore: 78,
                healthScoreFactors: [
                    {
                        factor: "Receivables Aging",
                        impact: "negative",
                        detail: "3 invoices overdue by more than 30 days."
                    },
                    {
                        factor: "Revenue Velocity",
                        impact: "positive",
                        detail: "Sales orders rose 12% over the last week."
                    },
                    {
                        factor: "Operating Runway",
                        impact: "positive",
                        detail: "Cash reserves are sufficient for 8 months of operations."
                    }
                ],
                updatedAt: new Date()
            };
        }
        // 2. Fetch AI Action suggestions
        let suggestions = [];
        try {
            const suggestionsSnapshot = await db
                .collection("ai_suggestions")
                .where("companyId", "==", companyId)
                .where("reviewStatus", "==", "pending")
                .limit(5)
                .get();
            suggestions = suggestionsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore unavailable, using mock fallback suggestions.");
        }
        // Seeding mock suggestions if offline/empty
        if (suggestions.length === 0) {
            if (!mockSuggestionsStore.has(companyId)) {
                mockSuggestionsStore.set(companyId, [
                    {
                        id: "sug_1",
                        companyId,
                        type: "draft_purchase_order",
                        targetModule: "purchase",
                        proposedPayload: {
                            vendorId: "vend_steel_corp",
                            vendorName: "Steel Corp India",
                            items: [{ productId: "prod_steel_bar", quantity: 500, price: 120 }],
                            total: 60000,
                        },
                        confidenceScore: 0.94,
                        reviewStatus: "pending",
                        createdAt: new Date(),
                    },
                    {
                        id: "sug_2",
                        companyId,
                        type: "draft_reminder",
                        targetModule: "sales",
                        proposedPayload: {
                            invoiceId: "inv_1024",
                            invoiceNumber: "INV-2026-0024",
                            customerId: "cust_apex_labs",
                            customerName: "Apex Labs Pvt Ltd",
                            amountOverdue: 15400,
                            daysOverdue: 12,
                        },
                        confidenceScore: 0.88,
                        reviewStatus: "pending",
                        createdAt: new Date(),
                    },
                ]);
            }
            suggestions = (mockSuggestionsStore.get(companyId) || []).filter(s => s.reviewStatus === "pending");
        }
        // 3. Fetch recent system activity events
        let activities = [];
        try {
            const activitySnapshot = await db
                .collection("activity_logs")
                .where("companyId", "==", companyId)
                .orderBy("createdAt", "desc")
                .limit(5)
                .get();
            activities = activitySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore unavailable, using mock fallback activities.");
        }
        if (activities.length === 0) {
            if (!mockActivitiesStore.has(companyId)) {
                mockActivitiesStore.set(companyId, [
                    {
                        id: "act_1",
                        companyId,
                        userId: "user_sales_1",
                        userName: "Amit Sharma",
                        module: "sales",
                        action: "create",
                        description: "Created Invoice INV-2026-0028 for ₹1,18,000",
                        createdAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
                    },
                    {
                        id: "act_2",
                        companyId,
                        userId: "user_accts_1",
                        userName: "Neha Gupta",
                        module: "banking",
                        action: "approve",
                        description: "Approved payment voucher for Vendor 'Logistics Hub'",
                        createdAt: new Date(Date.now() - 3600000 * 4), // 4 hours ago
                    },
                    {
                        id: "act_3",
                        companyId,
                        userId: "user_wh_1",
                        userName: "Rajesh Kumar",
                        module: "inventory",
                        action: "edit",
                        description: "Recorded stock transfer of 20 units to Warehouse B",
                        createdAt: new Date(Date.now() - 3600000 * 24), // 1 day ago
                    },
                ]);
            }
            activities = mockActivitiesStore.get(companyId) || [];
        }
        res.json({
            success: true,
            data: {
                summary: summaryData,
                suggestions,
                activities: activities.slice(0, 5),
            },
            meta: null,
            error: null,
        });
    }
    catch (error) {
        next(error);
    }
};
export const approveSuggestion = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "system";
        const userName = req.user?.email || "Admin User";
        const { id } = req.params;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let targetSuggestion = null;
        let approvedActionOutput = null;
        try {
            const docRef = db.collection("ai_suggestions").doc(id);
            const doc = await docRef.get();
            if (doc.exists && doc.data()?.companyId === companyId) {
                targetSuggestion = { id: doc.id, ...doc.data() };
                await docRef.update({
                    reviewStatus: "approved",
                    reviewedBy: userId,
                    updatedAt: new Date()
                });
                // Action Logic based on type
                if (targetSuggestion.type === "draft_purchase_order") {
                    const payload = targetSuggestion.proposedPayload;
                    const orderNumber = "PO-SUG-" + Math.random().toString(36).substring(2, 7).toUpperCase();
                    const poData = {
                        companyId,
                        orderNumber,
                        vendorId: payload.vendorId || "vend_steel_corp",
                        items: (payload.items || []).map((it) => ({
                            productId: it.productId,
                            description: it.description || `Auto-ordered ${it.productId}`,
                            quantity: it.quantity,
                            unitPrice: it.price || 0,
                            taxRate: 18,
                            lineTotal: it.quantity * (it.price || 0)
                        })),
                        subTotal: payload.total || 0,
                        taxAmount: (payload.total || 0) * 0.18,
                        discount: 0,
                        grandTotal: (payload.total || 0) * 1.18,
                        status: "draft",
                        createdAt: new Date(),
                        createdBy: userId,
                        updatedAt: new Date(),
                        updatedBy: userId,
                        isDeleted: false,
                        currencyCode: "INR",
                        exchangeRate: 1,
                        baseCurrencyAmount: (payload.total || 0) * 1.18
                    };
                    const poRef = await db.collection("purchase_orders").add(poData);
                    approvedActionOutput = { id: poRef.id, ...poData };
                }
                // Add activity log in firestore
                await db.collection("activity_logs").add({
                    companyId,
                    userId,
                    userName,
                    module: targetSuggestion.targetModule,
                    action: "approve",
                    description: `Approved suggestion: ${targetSuggestion.type.replace(/_/g, " ")}`,
                    createdAt: new Date()
                });
            }
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, approving suggestion in mock store.");
            const list = mockSuggestionsStore.get(companyId) || [];
            const idx = list.findIndex(s => s.id === id);
            if (idx !== -1) {
                list[idx] = {
                    ...list[idx],
                    reviewStatus: "approved",
                    reviewedBy: userId,
                    updatedAt: new Date()
                };
                targetSuggestion = list[idx];
                mockSuggestionsStore.set(companyId, list);
                // Action Logic fallback
                if (targetSuggestion.type === "draft_purchase_order") {
                    const payload = targetSuggestion.proposedPayload;
                    const orderNumber = "PO-SUG-" + Math.random().toString(36).substring(2, 7).toUpperCase();
                    const poData = {
                        id: "po_" + Math.random().toString(36).substring(2, 9),
                        companyId,
                        orderNumber,
                        vendorId: payload.vendorId || "vend_steel_corp",
                        items: (payload.items || []).map((it) => ({
                            productId: it.productId,
                            description: it.description || `Auto-ordered ${it.productId}`,
                            quantity: it.quantity,
                            unitPrice: it.price || 0,
                            taxRate: 18,
                            lineTotal: it.quantity * (it.price || 0)
                        })),
                        subTotal: payload.total || 0,
                        taxAmount: (payload.total || 0) * 0.18,
                        discount: 0,
                        grandTotal: (payload.total || 0) * 1.18,
                        status: "draft",
                        createdAt: new Date(),
                        createdBy: userId,
                        updatedAt: new Date(),
                        updatedBy: userId,
                        isDeleted: false,
                        currencyCode: "INR",
                        exchangeRate: 1,
                        baseCurrencyAmount: (payload.total || 0) * 1.18
                    };
                    const poList = mockPurchaseOrdersStore.get(companyId) || [];
                    poList.push(poData);
                    mockPurchaseOrdersStore.set(companyId, poList);
                    approvedActionOutput = poData;
                }
                // Add activity log to mock store
                const actList = mockActivitiesStore.get(companyId) || [];
                actList.unshift({
                    id: "act_" + Math.random().toString(36).substring(2, 9),
                    companyId,
                    userId,
                    userName,
                    module: targetSuggestion.targetModule,
                    action: "approve",
                    description: `Approved suggestion: ${targetSuggestion.type.replace(/_/g, " ")}`,
                    createdAt: new Date()
                });
                mockActivitiesStore.set(companyId, actList);
            }
        }
        if (!targetSuggestion) {
            res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Suggestion not found or access denied." } });
            return;
        }
        res.json({
            success: true,
            data: {
                suggestion: targetSuggestion,
                actionOutput: approvedActionOutput
            },
            meta: { message: "AI Action suggestion approved and processed successfully." },
            error: null
        });
    }
    catch (error) {
        next(error);
    }
};
export const dismissSuggestion = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "system";
        const { id } = req.params;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let targetSuggestion = null;
        try {
            const docRef = db.collection("ai_suggestions").doc(id);
            const doc = await docRef.get();
            if (doc.exists && doc.data()?.companyId === companyId) {
                targetSuggestion = { id: doc.id, ...doc.data() };
                await docRef.update({
                    reviewStatus: "dismissed",
                    reviewedBy: userId,
                    updatedAt: new Date()
                });
            }
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, dismissing suggestion in mock store.");
            const list = mockSuggestionsStore.get(companyId) || [];
            const idx = list.findIndex(s => s.id === id);
            if (idx !== -1) {
                list[idx] = {
                    ...list[idx],
                    reviewStatus: "dismissed",
                    reviewedBy: userId,
                    updatedAt: new Date()
                };
                targetSuggestion = list[idx];
                mockSuggestionsStore.set(companyId, list);
            }
        }
        if (!targetSuggestion) {
            res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Suggestion not found or access denied." } });
            return;
        }
        res.json({
            success: true,
            data: targetSuggestion,
            meta: { message: "AI Action suggestion dismissed." },
            error: null
        });
    }
    catch (error) {
        next(error);
    }
};
export const getActivityLogs = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let logs = [];
        try {
            const snapshot = await db.collection("activity_logs").where("companyId", "==", companyId).get();
            logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort by date desc
            logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, fetching activity logs from mock store.");
            logs = mockActivitiesStore.get(companyId) || [];
            logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        res.json({ success: true, data: logs, meta: { total: logs.length }, error: null });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=dashboard.controller.js.map
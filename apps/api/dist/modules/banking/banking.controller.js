import { db } from "../../config/firebase.js";
import admin from "../../config/firebase.js";
// Fallback in-memory mock stores for offline mode
export const mockBankAccountsStore = new Map();
export const mockBankTransactionsStore = new Map();
// Seeding default bank account if empty
const seedDefaultBankAccount = (companyId) => {
    const seeded = {
        id: "bank_seed_1",
        companyId,
        accountName: "HDFC Primary Checking Account",
        accountNumber: "501004829104",
        bankName: "HDFC Bank India",
        balance: 1450000,
        currencyCode: "INR",
        createdAt: new Date(),
        createdBy: "system",
        updatedAt: new Date(),
        updatedBy: "system",
        isDeleted: false
    };
    mockBankAccountsStore.set(companyId, [seeded]);
    // Seed some transaction items
    const txs = [
        {
            id: "tx_seed_1",
            companyId,
            bankAccountId: "bank_seed_1",
            date: new Date(Date.now() - 3600000 * 48), // 2 days ago
            description: "Payment recd from Apex Labs Pvt Ltd",
            amount: 15400,
            type: "deposit",
            reconciled: false,
            createdAt: new Date(),
            createdBy: "system",
            updatedAt: new Date(),
            updatedBy: "system",
            isDeleted: false
        },
        {
            id: "tx_seed_2",
            companyId,
            bankAccountId: "bank_seed_1",
            date: new Date(Date.now() - 3600000 * 24), // 1 day ago
            description: "Vendor settlement - Steel Corp India",
            amount: 60000,
            type: "withdrawal",
            reconciled: false,
            createdAt: new Date(),
            createdBy: "system",
            updatedAt: new Date(),
            updatedBy: "system",
            isDeleted: false
        }
    ];
    mockBankTransactionsStore.set(companyId, txs);
    return [seeded];
};
export const getBankAccounts = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let accounts = [];
        try {
            const snapshot = await db.collection("bank_accounts").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
            accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, fetching bank accounts from mock store.");
        }
        if (accounts.length === 0) {
            if (!mockBankAccountsStore.has(companyId)) {
                seedDefaultBankAccount(companyId);
            }
            accounts = (mockBankAccountsStore.get(companyId) || []).filter(a => !a.isDeleted);
        }
        res.json({ success: true, data: accounts, meta: { total: accounts.length }, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const createBankAccount = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "system";
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        const newBankAccount = {
            ...req.body,
            companyId,
            createdAt: new Date(),
            createdBy: userId,
            updatedAt: new Date(),
            updatedBy: userId,
            isDeleted: false,
        };
        let createdAcc;
        try {
            const docRef = await db.collection("bank_accounts").add(newBankAccount);
            createdAcc = { id: docRef.id, ...newBankAccount };
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, writing bank account to mock store.");
            const id = "bank_" + Math.random().toString(36).substring(2, 9);
            createdAcc = { id, ...newBankAccount };
            const list = mockBankAccountsStore.get(companyId) || [];
            list.push(createdAcc);
            mockBankAccountsStore.set(companyId, list);
        }
        res.status(201).json({ success: true, data: createdAcc, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const getBankTransactions = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let txs = [];
        try {
            const snapshot = await db.collection("bank_transactions").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
            txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, fetching transactions from mock store.");
        }
        if (txs.length === 0) {
            if (!mockBankTransactionsStore.has(companyId)) {
                seedDefaultBankAccount(companyId);
            }
            txs = (mockBankTransactionsStore.get(companyId) || []).filter(t => !t.isDeleted);
        }
        res.json({ success: true, data: txs, meta: { total: txs.length }, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const createBankTransaction = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "system";
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        const { bankAccountId, amount, type } = req.body;
        const newTx = {
            ...req.body,
            companyId,
            createdAt: new Date(),
            createdBy: userId,
            updatedAt: new Date(),
            updatedBy: userId,
            isDeleted: false,
        };
        let createdTx;
        try {
            const docRef = await db.collection("bank_transactions").add(newTx);
            createdTx = { id: docRef.id, ...newTx };
            // Adjust bank account balance in Firestore
            const balanceDiff = type === "deposit" ? amount : -amount;
            await db.collection("bank_accounts").doc(bankAccountId).update({
                balance: admin.firestore.FieldValue.increment(balanceDiff)
            });
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, writing transaction to mock store.");
            const id = "tx_" + Math.random().toString(36).substring(2, 9);
            createdTx = { id, ...newTx };
            const list = mockBankTransactionsStore.get(companyId) || [];
            list.push(createdTx);
            mockBankTransactionsStore.set(companyId, list);
            // Adjust mock account balance
            const aList = mockBankAccountsStore.get(companyId) || [];
            const acc = aList.find(a => a.id === bankAccountId);
            if (acc) {
                acc.balance = (acc.balance || 0) + (type === "deposit" ? amount : -amount);
            }
            mockBankAccountsStore.set(companyId, aList);
        }
        res.status(201).json({ success: true, data: createdTx, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const reconcileTransaction = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const { id } = req.params;
        const { matchedTransactionId } = req.body; // e.g. matching invoice / bill / journal ID
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let updatedTx = null;
        try {
            const ref = db.collection("bank_transactions").doc(id);
            await ref.update({
                reconciled: true,
                matchedTransactionId,
                updatedAt: new Date()
            });
            const doc = await ref.get();
            updatedTx = { id: doc.id, ...doc.data() };
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, reconciling transaction in mock store.");
            const list = mockBankTransactionsStore.get(companyId) || [];
            const idx = list.findIndex(t => t.id === id);
            if (idx !== -1) {
                list[idx] = {
                    ...list[idx],
                    reconciled: true,
                    matchedTransactionId,
                    updatedAt: new Date()
                };
                updatedTx = list[idx];
                mockBankTransactionsStore.set(companyId, list);
            }
        }
        if (!updatedTx) {
            res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Transaction not found." } });
            return;
        }
        res.json({ success: true, data: updatedTx, meta: { message: "Bank transaction reconciled." }, error: null });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=banking.controller.js.map
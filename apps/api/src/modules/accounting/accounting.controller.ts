import { Request, Response, NextFunction } from "express";
import { db } from "../../config/firebase.js";
import admin from "../../config/firebase.js";
import { Account, JournalEntry, FixedAsset } from "@flowos/shared-types";

// Fallback in-memory mock stores for offline mode
export const mockAccountsStore = new Map<string, Account[]>();
export const mockJournalEntriesStore = new Map<string, JournalEntry[]>();
export const mockFixedAssetsStore = new Map<string, FixedAsset[]>();

// Seeding Default Chart of Accounts if empty
const seedDefaultAccounts = (companyId: string): Account[] => {
  const defaults: Omit<Account, "id" | "companyId" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "isDeleted">[] = [
    { name: "Cash & Bank Register", code: "1010", type: "asset", balance: 1450000 },
    { name: "Accounts Receivable", code: "1020", type: "asset", balance: 48000 },
    { name: "Inventory Asset Account", code: "1030", type: "asset", balance: 120000 },
    { name: "Fixed Assets Capital Block", code: "1040", type: "asset", balance: 250000 },
    { name: "Accounts Payable", code: "2010", type: "liability", balance: 18500 },
    { name: "GST Clearing Account", code: "2020", type: "liability", balance: 8500 },
    { name: "Owners Equity Capital", code: "3010", type: "equity", balance: 1000000 },
    { name: "Retained Surplus Profit", code: "3020", type: "equity", balance: 841000 },
    { name: "Sales Revenues", code: "4010", type: "revenue", balance: 350000 },
    { name: "Employee Payroll Expense", code: "5010", type: "expense", balance: 90000 },
    { name: "Depreciation & Writeoffs", code: "5020", type: "expense", balance: 10000 },
    { name: "Rent & Facilities Expense", code: "5030", type: "expense", balance: 20000 }
  ];

  const seeded: Account[] = defaults.map((acc, idx) => ({
    id: `acc_seed_${idx + 1}`,
    ...acc,
    companyId,
    createdAt: new Date(),
    createdBy: "system",
    updatedAt: new Date(),
    updatedBy: "system",
    isDeleted: false
  }));

  mockAccountsStore.set(companyId, seeded);
  return seeded;
};

// ==========================================
// CHART OF ACCOUNTS
// ==========================================
export const getAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let accounts: Account[] = [];
    try {
      const snapshot = await db.collection("accounts").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching accounts from mock store.");
    }

    if (accounts.length === 0) {
      if (!mockAccountsStore.has(companyId)) {
        seedDefaultAccounts(companyId);
      }
      accounts = (mockAccountsStore.get(companyId) || []).filter(a => !a.isDeleted);
    }

    res.json({ success: true, data: accounts, meta: { total: accounts.length }, error: null });
  } catch (error) {
    next(error);
  }
};

export const createAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const newAccountData: Omit<Account, "id"> = {
      ...req.body,
      companyId,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false,
    };

    let createdAccount: Account;
    try {
      const docRef = await db.collection("accounts").add(newAccountData);
      createdAccount = { id: docRef.id, ...newAccountData } as Account;
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, saving account to mock store.");
      const id = "acc_" + Math.random().toString(36).substring(2, 9);
      createdAccount = { id, ...newAccountData } as Account;

      const list = mockAccountsStore.get(companyId) || [];
      list.push(createdAccount);
      mockAccountsStore.set(companyId, list);
    }

    res.status(201).json({ success: true, data: createdAccount, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// JOURNAL ENTRIES
// ==========================================
export const getJournalEntries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let journals: JournalEntry[] = [];
    try {
      const snapshot = await db.collection("journal_entries").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      journals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalEntry));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching journals from mock store.");
      journals = (mockJournalEntriesStore.get(companyId) || []).filter(j => !j.isDeleted);
    }

    res.json({ success: true, data: journals, meta: { total: journals.length }, error: null });
  } catch (error) {
    next(error);
  }
};

export const createJournalEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const { lines, status } = req.body;
    
    // 1. Verify debits equal credits
    let totalDebit = 0;
    let totalCredit = 0;
    lines.forEach((l: any) => {
      totalDebit += l.debit || 0;
      totalCredit += l.credit || 0;
    });

    // Handle float precision issues
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      res.status(400).json({
        success: false,
        data: null,
        error: { code: "UNBALANCED_ENTRY", message: `Journal entry is unbalanced. Debits (₹${totalDebit}) must equal Credits (₹${totalCredit}).` }
      });
      return;
    }

    const newJournalData: Omit<JournalEntry, "id"> = {
      ...req.body,
      companyId,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false,
    };

    let createdJournal: JournalEntry;
    try {
      const docRef = await db.collection("journal_entries").add(newJournalData);
      createdJournal = { id: docRef.id, ...newJournalData } as JournalEntry;

      // 2. Adjust account ledger balances in Firestore if posted
      if (status === "posted") {
        for (const line of lines) {
          const accRef = db.collection("accounts").doc(line.accountId);
          const accDoc = await accRef.get();
          if (accDoc.exists) {
            const acc = accDoc.data() as Account;
            // Determine balance direction change based on debit/credit rules
            let balanceDiff = 0;
            const isDebitIncrease = acc.type === "asset" || acc.type === "expense";
            
            if (line.debit > 0) {
              balanceDiff = isDebitIncrease ? line.debit : -line.debit;
            } else if (line.credit > 0) {
              balanceDiff = isDebitIncrease ? -line.credit : line.credit;
            }

            await accRef.update({
              balance: admin.firestore.FieldValue.increment(balanceDiff)
            });
          }
        }
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, saving journal to mock store.");
      const id = "je_" + Math.random().toString(36).substring(2, 9);
      createdJournal = { id, ...newJournalData } as JournalEntry;

      const list = mockJournalEntriesStore.get(companyId) || [];
      list.push(createdJournal);
      mockJournalEntriesStore.set(companyId, list);

      // Adjust mock accounts balances
      if (status === "posted") {
        const accList = mockAccountsStore.get(companyId) || [];
        for (const line of lines) {
          const acc = accList.find(a => a.id === line.accountId);
          if (acc) {
            let balanceDiff = 0;
            const isDebitIncrease = acc.type === "asset" || acc.type === "expense";
            
            if (line.debit > 0) {
              balanceDiff = isDebitIncrease ? line.debit : -line.debit;
            } else if (line.credit > 0) {
              balanceDiff = isDebitIncrease ? -line.credit : line.credit;
            }
            acc.balance = (acc.balance || 0) + balanceDiff;
          }
        }
        mockAccountsStore.set(companyId, accList);
      }
    }

    res.status(201).json({ success: true, data: createdJournal, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// FIXED ASSETS
// ==========================================
export const getFixedAssets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let assets: FixedAsset[] = [];
    try {
      const snapshot = await db.collection("fixed_assets").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedAsset));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching fixed assets from mock store.");
      assets = (mockFixedAssetsStore.get(companyId) || []).filter(fa => !fa.isDeleted);
    }

    res.json({ success: true, data: assets, meta: { total: assets.length }, error: null });
  } catch (error) {
    next(error);
  }
};

export const createFixedAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const newAssetData: Omit<FixedAsset, "id"> = {
      ...req.body,
      companyId,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false,
    };

    let createdAsset: FixedAsset;
    try {
      const docRef = await db.collection("fixed_assets").add(newAssetData);
      createdAsset = { id: docRef.id, ...newAssetData } as FixedAsset;
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, writing asset to mock store.");
      const id = "asset_" + Math.random().toString(36).substring(2, 9);
      createdAsset = { id, ...newAssetData } as FixedAsset;

      const list = mockFixedAssetsStore.get(companyId) || [];
      list.push(createdAsset);
      mockFixedAssetsStore.set(companyId, list);
    }

    res.status(201).json({ success: true, data: createdAsset, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

export const runAssetDepreciation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    const userName = req.user?.email || "Admin User";
    const { id } = req.params;

    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let updatedAsset: FixedAsset | null = null;
    let depAmount = 0;
    try {
      const assetRef = db.collection("fixed_assets").doc(id);
      const doc = await assetRef.get();
      if (doc.exists && doc.data()?.companyId === companyId && !doc.data()?.isDeleted) {
        const asset = doc.data() as FixedAsset;
        
        // Calculate monthly depreciation
        if (asset.depreciationMethod === "straight_line") {
          depAmount = asset.purchaseValue / asset.usefulLifeMonths;
        } else {
          depAmount = asset.currentBookValue * (1.5 / asset.usefulLifeMonths);
        }
        depAmount = Math.min(depAmount, asset.currentBookValue); // Cannot write off more than value

        const newBookValue = Math.max(0, asset.currentBookValue - depAmount);

        await assetRef.update({
          currentBookValue: newBookValue,
          updatedAt: new Date(),
          updatedBy: userId
        });

        // Add activity log
        await db.collection("activity_logs").add({
          companyId,
          userId,
          userName,
          module: "accounting",
          action: "edit",
          description: `Ran monthly depreciation for asset: ${asset.name} (Value: -₹${depAmount.toFixed(2)})`,
          createdAt: new Date()
        });

        updatedAsset = { ...asset, currentBookValue: newBookValue } as FixedAsset;
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, executing asset depreciation in mock store.");
      const list = mockFixedAssetsStore.get(companyId) || [];
      const idx = list.findIndex(a => a.id === id && !a.isDeleted);
      if (idx !== -1) {
        const asset = list[idx];
        if (asset.depreciationMethod === "straight_line") {
          depAmount = asset.purchaseValue / asset.usefulLifeMonths;
        } else {
          depAmount = asset.currentBookValue * (1.5 / asset.usefulLifeMonths);
        }
        depAmount = Math.min(depAmount, asset.currentBookValue);
        const newBookValue = Math.max(0, asset.currentBookValue - depAmount);

        list[idx] = {
          ...asset,
          currentBookValue: newBookValue,
          updatedAt: new Date(),
          updatedBy: userId
        };
        updatedAsset = list[idx];
        mockFixedAssetsStore.set(companyId, list);
      }
    }

    if (!updatedAsset) {
      res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Asset not found." } });
      return;
    }

    res.json({ success: true, data: updatedAsset, meta: { amountDepreciated: depAmount }, error: null });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// REPORTS (PROFIT & LOSS & BALANCE SHEET)
// ==========================================
export const getProfitAndLoss = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    // Load accounts
    if (!mockAccountsStore.has(companyId)) {
      seedDefaultAccounts(companyId);
    }
    const accList = mockAccountsStore.get(companyId) || [];

    let revenueTotal = 0;
    let expenseTotal = 0;
    const revenues: any[] = [];
    const expenses: any[] = [];

    accList.forEach(a => {
      if (a.type === "revenue") {
        revenueTotal += a.balance || 0;
        revenues.push({ name: a.name, code: a.code, balance: a.balance });
      } else if (a.type === "expense") {
        expenseTotal += a.balance || 0;
        expenses.push({ name: a.name, code: a.code, balance: a.balance });
      }
    });

    res.json({
      success: true,
      data: {
        revenues,
        expenses,
        revenueTotal,
        expenseTotal,
        netIncome: revenueTotal - expenseTotal
      },
      meta: null,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getBalanceSheet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    if (!mockAccountsStore.has(companyId)) {
      seedDefaultAccounts(companyId);
    }
    const accList = mockAccountsStore.get(companyId) || [];

    let assetTotal = 0;
    let liabilityTotal = 0;
    let equityTotal = 0;
    const assets: any[] = [];
    const liabilities: any[] = [];
    const equities: any[] = [];

    accList.forEach(a => {
      if (a.type === "asset") {
        assetTotal += a.balance || 0;
        assets.push({ name: a.name, code: a.code, balance: a.balance });
      } else if (a.type === "liability") {
        liabilityTotal += a.balance || 0;
        liabilities.push({ name: a.name, code: a.code, balance: a.balance });
      } else if (a.type === "equity") {
        equityTotal += a.balance || 0;
        equities.push({ name: a.name, code: a.code, balance: a.balance });
      }
    });

    res.json({
      success: true,
      data: {
        assets,
        liabilities,
        equities,
        assetTotal,
        liabilityTotal,
        equityTotal,
        totalLiabilitiesAndEquity: liabilityTotal + equityTotal
      },
      meta: null,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

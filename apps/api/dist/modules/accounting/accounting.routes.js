import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validateSchema } from "../../middleware/validation.js";
import { createAccountSchema, createJournalEntrySchema, createFixedAssetSchema } from "./accounting.validation.js";
import { getAccounts, createAccount, getJournalEntries, createJournalEntry, getFixedAssets, createFixedAsset, runAssetDepreciation, getProfitAndLoss, getBalanceSheet } from "./accounting.controller.js";
const router = Router();
router.use(authenticate);
// Accounts
router.get("/accounts", requirePermission("accounting", "view"), getAccounts);
router.post("/accounts", requirePermission("accounting", "create"), validateSchema(createAccountSchema), createAccount);
// Journal Entries
router.get("/journals", requirePermission("accounting", "view"), getJournalEntries);
router.post("/journals", requirePermission("accounting", "create"), validateSchema(createJournalEntrySchema), createJournalEntry);
// Fixed Assets
router.get("/assets", requirePermission("accounting", "view"), getFixedAssets);
router.post("/assets", requirePermission("accounting", "create"), validateSchema(createFixedAssetSchema), createFixedAsset);
router.post("/assets/:id/depreciate", requirePermission("accounting", "edit"), runAssetDepreciation);
// Reports
router.get("/reports/pl", requirePermission("accounting", "view"), getProfitAndLoss);
router.get("/reports/balance-sheet", requirePermission("accounting", "view"), getBalanceSheet);
export default router;
//# sourceMappingURL=accounting.routes.js.map
import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validateSchema } from "../../middleware/validation.js";
import { createBankAccountSchema, createBankTransactionSchema } from "./banking.validation.js";
import {
  getBankAccounts,
  createBankAccount,
  getBankTransactions,
  createBankTransaction,
  reconcileTransaction
} from "./banking.controller.js";

const router = Router();

router.use(authenticate);

router.get("/accounts", requirePermission("banking", "view"), getBankAccounts);
router.post("/accounts", requirePermission("banking", "create"), validateSchema(createBankAccountSchema), createBankAccount);

router.get("/transactions", requirePermission("banking", "view"), getBankTransactions);
router.post("/transactions", requirePermission("banking", "create"), validateSchema(createBankTransactionSchema), createBankTransaction);
router.post("/transactions/:id/reconcile", requirePermission("banking", "approve"), reconcileTransaction);

export default router;

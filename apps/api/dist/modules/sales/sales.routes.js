import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validateSchema } from "../../middleware/validation.js";
import { createInvoiceSchema, createSalesOrderSchema, recordPaymentSchema, createRetainerSchema, createCreditNoteSchema } from "./sales.validation.js";
import { getInvoices, getInvoiceById, createInvoice, recordInvoicePayment, getSalesOrders, createSalesOrder, getRetainerInvoices, createRetainerInvoice, getCreditNotes, createCreditNote } from "./sales.controller.js";
const router = Router();
router.use(authenticate);
// Invoices
router.get("/invoices", requirePermission("sales", "view"), getInvoices);
router.get("/invoices/:id", requirePermission("sales", "view"), getInvoiceById);
router.post("/invoices", requirePermission("sales", "create"), validateSchema(createInvoiceSchema), createInvoice);
router.post("/invoices/:id/payment", requirePermission("sales", "edit"), validateSchema(recordPaymentSchema), recordInvoicePayment);
// Sales Orders
router.get("/orders", requirePermission("sales", "view"), getSalesOrders);
router.post("/orders", requirePermission("sales", "create"), validateSchema(createSalesOrderSchema), createSalesOrder);
// Retainer Invoices
router.get("/retainers", requirePermission("sales", "view"), getRetainerInvoices);
router.post("/retainers", requirePermission("sales", "create"), validateSchema(createRetainerSchema), createRetainerInvoice);
// Credit Notes
router.get("/credit-notes", requirePermission("sales", "view"), getCreditNotes);
router.post("/credit-notes", requirePermission("sales", "create"), validateSchema(createCreditNoteSchema), createCreditNote);
export default router;
//# sourceMappingURL=sales.routes.js.map
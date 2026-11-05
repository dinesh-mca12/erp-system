import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validateSchema } from "../../middleware/validation.js";
import { createPurchaseOrderSchema, createBillSchema } from "./purchase.validation.js";
import { getPurchaseOrders, createPurchaseOrder, getBills, createBill } from "./purchase.controller.js";
const router = Router();
router.use(authenticate);
router.get("/orders", requirePermission("purchase", "view"), getPurchaseOrders);
router.post("/orders", requirePermission("purchase", "create"), validateSchema(createPurchaseOrderSchema), createPurchaseOrder);
router.get("/bills", requirePermission("purchase", "view"), getBills);
router.post("/bills", requirePermission("purchase", "create"), validateSchema(createBillSchema), createBill);
export default router;
//# sourceMappingURL=purchase.routes.js.map
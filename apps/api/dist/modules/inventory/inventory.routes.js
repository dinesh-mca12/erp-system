import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validateSchema } from "../../middleware/validation.js";
import { createWarehouseSchema, stockAdjustmentSchema, stockTransferSchema } from "./inventory.validation.js";
import { getWarehouses, createWarehouse, adjustStock, transferStock } from "./inventory.controller.js";
const router = Router();
router.use(authenticate);
router.get("/warehouses", requirePermission("inventory", "view"), getWarehouses);
router.post("/warehouses", requirePermission("inventory", "create"), validateSchema(createWarehouseSchema), createWarehouse);
router.post("/adjustments", requirePermission("inventory", "create"), validateSchema(stockAdjustmentSchema), adjustStock);
router.post("/transfers", requirePermission("inventory", "create"), validateSchema(stockTransferSchema), transferStock);
export default router;
//# sourceMappingURL=inventory.routes.js.map
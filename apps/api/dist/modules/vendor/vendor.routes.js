import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validateSchema } from "../../middleware/validation.js";
import { createVendorSchema, updateVendorSchema } from "./vendor.validation.js";
import { getVendors, getVendorById, createVendor, updateVendor, deleteVendor } from "./vendor.controller.js";
const router = Router();
// Apply auth middleware to all vendor endpoints
router.use(authenticate);
// Vendors CRUD endpoints
router.get("/", requirePermission("purchase", "view"), getVendors);
router.get("/:id", requirePermission("purchase", "view"), getVendorById);
router.post("/", requirePermission("purchase", "create"), validateSchema(createVendorSchema), createVendor);
router.put("/:id", requirePermission("purchase", "edit"), validateSchema(updateVendorSchema), updateVendor);
router.delete("/:id", requirePermission("purchase", "delete"), deleteVendor);
export default router;
//# sourceMappingURL=vendor.routes.js.map
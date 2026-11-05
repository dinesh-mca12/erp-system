import { Router } from "express";
import { getCompany, updateCompany } from "./company.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";

const router = Router();

// Apply auth middleware to all company routes
router.use(authenticate);

// GET /api/v1/company
router.get("/", requirePermission("company", "view"), getCompany);

// PUT /api/v1/company
router.put("/", requirePermission("company", "edit"), updateCompany);

export default router;

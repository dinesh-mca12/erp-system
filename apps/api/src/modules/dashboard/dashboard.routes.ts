import { Router } from "express";
import { getDashboardSummary, approveSuggestion, dismissSuggestion, getActivityLogs } from "./dashboard.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";

const router = Router();

// Secure dashboard endpoints
router.use(authenticate);

// GET /api/v1/dashboard/summary
router.get("/summary", requirePermission("dashboard", "view"), getDashboardSummary);

// GET /api/v1/dashboard/activities
router.get("/activities", requirePermission("dashboard", "view"), getActivityLogs);

// AI Suggestions review triggers
router.post("/suggestions/:id/approve", requirePermission("ai", "create"), approveSuggestion);
router.post("/suggestions/:id/dismiss", requirePermission("ai", "create"), dismissSuggestion);

export default router;

import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { getRunwayForecaster } from "./analytics.controller.js";
const router = Router();
router.use(authenticate);
router.get("/runway", requirePermission("accounting", "view"), getRunwayForecaster);
export default router;
//# sourceMappingURL=analytics.routes.js.map
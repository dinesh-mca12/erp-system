import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validateSchema } from "../../middleware/validation.js";
import { createProjectSchema, createTimesheetSchema } from "./projects.validation.js";
import { getProjects, createProject, getTimesheets, createTimesheet } from "./projects.controller.js";
const router = Router();
router.use(authenticate);
router.get("/", requirePermission("projects", "view"), getProjects);
router.post("/", requirePermission("projects", "create"), validateSchema(createProjectSchema), createProject);
router.get("/timesheets", requirePermission("projects", "view"), getTimesheets);
router.post("/timesheets", requirePermission("projects", "create"), validateSchema(createTimesheetSchema), createTimesheet);
export default router;
//# sourceMappingURL=projects.routes.js.map
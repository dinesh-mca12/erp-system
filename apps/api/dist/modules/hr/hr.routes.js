import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validateSchema } from "../../middleware/validation.js";
import { createEmployeeSchema, createPayslipSchema } from "./hr.validation.js";
import { getEmployees, createEmployee, getPayslips, generateMonthlyPayslip } from "./hr.controller.js";
const router = Router();
router.use(authenticate);
router.get("/employees", requirePermission("hr", "view"), getEmployees);
router.post("/employees", requirePermission("hr", "create"), validateSchema(createEmployeeSchema), createEmployee);
router.get("/payslips", requirePermission("hr", "view"), getPayslips);
router.post("/payslips", requirePermission("hr", "create"), validateSchema(createPayslipSchema), generateMonthlyPayslip);
export default router;
//# sourceMappingURL=hr.routes.js.map
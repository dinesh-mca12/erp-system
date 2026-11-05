import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validateSchema } from "../../middleware/validation.js";
import { createEmployeeProfileSchema, updateEmployeeProfileSchema, createDepartmentSchema } from "./employees.validation.js";
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getDepartments, createDepartment } from "./employees.controller.js";
const router = Router();
router.use(authenticate);
// Employees CRUD
router.get("/", requirePermission("hr", "view"), getEmployees);
router.post("/", requirePermission("hr", "create"), validateSchema(createEmployeeProfileSchema), createEmployee);
router.put("/:id", requirePermission("hr", "edit"), validateSchema(updateEmployeeProfileSchema), updateEmployee);
router.delete("/:id", requirePermission("hr", "delete"), deleteEmployee);
// Departments CRUD
router.get("/departments", requirePermission("hr", "view"), getDepartments);
router.post("/departments", requirePermission("hr", "create"), validateSchema(createDepartmentSchema), createDepartment);
export default router;
//# sourceMappingURL=employees.routes.js.map
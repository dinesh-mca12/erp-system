import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validateSchema } from "../../middleware/validation.js";
import { createTaskSchema, updateTaskSchema } from "./tasks.validation.js";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask
} from "./tasks.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("projects", "view"), getTasks);
router.post("/", requirePermission("projects", "create"), validateSchema(createTaskSchema), createTask);
router.put("/:id", requirePermission("projects", "edit"), validateSchema(updateTaskSchema), updateTask);
router.delete("/:id", requirePermission("projects", "delete"), deleteTask);

export default router;

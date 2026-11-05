import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validateSchema } from "../../middleware/validation.js";
import { createCustomerSchema, updateCustomerSchema } from "./customer.validation.js";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from "./customer.controller.js";

const router = Router();

// Apply auth middleware to all customer endpoints
router.use(authenticate);

// Customers CRUD endpoints
router.get("/", requirePermission("sales", "view"), getCustomers);
router.get("/:id", requirePermission("sales", "view"), getCustomerById);
router.post("/", requirePermission("sales", "create"), validateSchema(createCustomerSchema), createCustomer);
router.put("/:id", requirePermission("sales", "edit"), validateSchema(updateCustomerSchema), updateCustomer);
router.delete("/:id", requirePermission("sales", "delete"), deleteCustomer);

export default router;

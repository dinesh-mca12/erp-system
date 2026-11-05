import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validateSchema } from "../../middleware/validation.js";
import { createProductSchema, updateProductSchema, createWarehouseSchema, createCategorySchema, createBrandSchema, createUnitSchema, createTaxSettingSchema } from "./product.validation.js";
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getWarehouses, createWarehouse, getCategories, createCategory, getBrands, createBrand, getUnits, createUnit, getTaxes, createTax } from "./product.controller.js";
const router = Router();
// Apply auth to all endpoints
router.use(authenticate);
// Product lookups endpoints (registered first to avoid clash with :id router)
router.get("/warehouses", requirePermission("inventory", "view"), getWarehouses);
router.post("/warehouses", requirePermission("inventory", "create"), validateSchema(createWarehouseSchema), createWarehouse);
router.get("/categories", requirePermission("inventory", "view"), getCategories);
router.post("/categories", requirePermission("inventory", "create"), validateSchema(createCategorySchema), createCategory);
router.get("/brands", requirePermission("inventory", "view"), getBrands);
router.post("/brands", requirePermission("inventory", "create"), validateSchema(createBrandSchema), createBrand);
router.get("/units", requirePermission("inventory", "view"), getUnits);
router.post("/units", requirePermission("inventory", "create"), validateSchema(createUnitSchema), createUnit);
router.get("/taxes", requirePermission("company", "view"), getTaxes);
router.post("/taxes", requirePermission("company", "edit"), validateSchema(createTaxSettingSchema), createTax);
// Standard Product CRUD endpoints
router.get("/", requirePermission("inventory", "view"), getProducts);
router.get("/:id", requirePermission("inventory", "view"), getProductById);
router.post("/", requirePermission("inventory", "create"), validateSchema(createProductSchema), createProduct);
router.put("/:id", requirePermission("inventory", "edit"), validateSchema(updateProductSchema), updateProduct);
router.delete("/:id", requirePermission("inventory", "delete"), deleteProduct);
export default router;
//# sourceMappingURL=product.routes.js.map
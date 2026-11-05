import { z } from "zod";
export const createWarehouseSchema = z.object({
    name: z.string().min(1, "Warehouse name is required."),
    location: z.string().min(1, "Location is required."),
    code: z.string().min(1, "Warehouse code is required."),
});
export const stockAdjustmentSchema = z.object({
    warehouseId: z.string().min(1, "Warehouse is required."),
    productId: z.string().min(1, "Product is required."),
    type: z.enum(["increment", "decrement"]),
    quantity: z.number().positive("Quantity must be positive."),
    reason: z.string().min(1, "Reason is required."),
});
export const stockTransferSchema = z.object({
    sourceWarehouseId: z.string().min(1, "Source warehouse is required."),
    targetWarehouseId: z.string().min(1, "Target warehouse is required."),
    productId: z.string().min(1, "Product is required."),
    quantity: z.number().positive("Quantity must be positive."),
});
//# sourceMappingURL=inventory.validation.js.map
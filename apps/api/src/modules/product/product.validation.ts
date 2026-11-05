import { z } from "zod";

export const createProductSchema = z.object({
  sku: z.string().min(1, "SKU is required."),
  barcode: z.string().optional(),
  hsn: z.string().min(1, "HSN code is required."),
  name: z.string().min(1, "Product name is required."),
  type: z.enum(["product", "service", "digital", "composite"]),
  categoryId: z.string().min(1, "Category is required."),
  brandId: z.string().optional(),
  unitId: z.string().min(1, "Unit of measure is required."),
  sellingPrice: z.number().nonnegative(),
  purchasePrice: z.number().nonnegative(),
  taxRate: z.number().nonnegative(),
  openingStock: z.number().nonnegative().default(0),
  minStock: z.number().nonnegative().default(0),
  maxStock: z.number().nonnegative().default(0),
  variants: z.array(z.object({
    color: z.string().optional(),
    size: z.string().optional(),
    weight: z.string().optional(),
  })).optional(),
  batchTracked: z.boolean().default(false),
  serialTracked: z.boolean().default(false),
  expiryTracked: z.boolean().default(false),
  valuationMethod: z.enum(["fifo", "weighted_average"]).default("fifo"),
  images: z.array(z.string()).default([]),
});

export const updateProductSchema = createProductSchema.partial();

export const createWarehouseSchema = z.object({
  name: z.string().min(1, "Warehouse name is required."),
  code: z.string().min(1, "Warehouse code is required."),
  location: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required."),
  description: z.string().optional(),
});

export const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required."),
  description: z.string().optional(),
});

export const createUnitSchema = z.object({
  name: z.string().min(1, "Unit name is required."),
  abbreviation: z.string().min(1, "Abbreviation is required."),
});

export const createTaxSettingSchema = z.object({
  name: z.string().min(1, "Tax name is required."),
  rate: z.number().nonnegative(),
  type: z.enum(["cgst", "sgst", "igst", "flat", "group"]),
  subTaxes: z.array(z.string()).optional(),
});

import { z } from "zod";

const lineItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required."),
  description: z.string().min(1, "Description is required."),
  quantity: z.number().positive("Quantity must be positive."),
  unitPrice: z.number().nonnegative("Unit price must be non-negative."),
  taxRate: z.number().nonnegative("Tax rate must be non-negative."),
  lineTotal: z.number().nonnegative(),
});

export const createPurchaseOrderSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required."),
  vendorId: z.string().min(1, "Vendor ID is required."),
  items: z.array(lineItemSchema).min(1, "At least one item is required."),
  subTotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  grandTotal: z.number().nonnegative(),
  status: z.enum(["draft", "approved", "billed", "cancelled"]).default("draft"),
  expectedDeliveryDate: z.any().optional(),
  currencyCode: z.string().min(1, "Currency code is required.").default("INR"),
  exchangeRate: z.number().positive().default(1),
  baseCurrencyAmount: z.number().nonnegative(),
});

export const createBillSchema = z.object({
  billNumber: z.string().min(1, "Bill number is required."),
  vendorId: z.string().min(1, "Vendor ID is required."),
  purchaseOrderId: z.string().optional(),
  items: z.array(lineItemSchema).min(1, "At least one item is required."),
  subTotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  grandTotal: z.number().nonnegative(),
  amountPaid: z.number().nonnegative().default(0),
  amountDue: z.number().nonnegative(),
  status: z.enum(["draft", "unpaid", "partially_paid", "paid", "overdue", "cancelled"]).default("unpaid"),
  dueDate: z.any(),
  currencyCode: z.string().min(1, "Currency code is required.").default("INR"),
  exchangeRate: z.number().positive().default(1),
  baseCurrencyAmount: z.number().nonnegative(),
});

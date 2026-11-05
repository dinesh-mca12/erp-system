import { z } from "zod";

const lineItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required."),
  description: z.string().min(1, "Description is required."),
  quantity: z.number().positive("Quantity must be positive."),
  unitPrice: z.number().nonnegative("Unit price must be non-negative."),
  taxRate: z.number().nonnegative("Tax rate must be non-negative."),
  lineTotal: z.number().nonnegative(),
});

export const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required."),
  customerId: z.string().min(1, "Customer ID is required."),
  salesOrderId: z.string().optional(),
  items: z.array(lineItemSchema).min(1, "At least one item is required."),
  subTotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  grandTotal: z.number().nonnegative(),
  amountPaid: z.number().nonnegative().default(0),
  amountDue: z.number().nonnegative(),
  status: z.enum(["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"]).default("draft"),
  gstDetails: z.object({
    gstin: z.string().default(""),
    cgst: z.number().nonnegative().default(0),
    sgst: z.number().nonnegative().default(0),
    igst: z.number().nonnegative().default(0),
  }).default({ gstin: "", cgst: 0, sgst: 0, igst: 0 }),
  einvoiceIrn: z.string().optional(),
  ewayBillNumber: z.string().optional(),
  dueDate: z.any(),
  currencyCode: z.string().min(1, "Currency code is required.").default("INR"),
  exchangeRate: z.number().positive().default(1),
  baseCurrencyAmount: z.number().nonnegative(),
});

export const createSalesOrderSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required."),
  customerId: z.string().min(1, "Customer ID is required."),
  items: z.array(lineItemSchema).min(1, "At least one item is required."),
  subTotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  grandTotal: z.number().nonnegative(),
  status: z.enum(["draft", "approved", "invoiced", "cancelled"]).default("draft"),
  deliveryDate: z.any().optional(),
  currencyCode: z.string().min(1, "Currency code is required.").default("INR"),
  exchangeRate: z.number().positive().default(1),
  baseCurrencyAmount: z.number().nonnegative(),
});

export const recordPaymentSchema = z.object({
  amountPaid: z.number().positive("Amount paid must be positive."),
});

export const createRetainerSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required."),
  amount: z.number().positive("Amount must be positive."),
  currencyCode: z.string().min(1, "Currency code is required.").default("INR"),
  exchangeRate: z.number().positive().default(1),
  baseCurrencyAmount: z.number().nonnegative(),
});

export const createCreditNoteSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required."),
  invoiceId: z.string().optional(),
  reason: z.string().min(1, "Reason is required."),
  amount: z.number().positive("Amount must be positive."),
  action: z.enum(["refund", "apply_to_invoice", "open_credit"]).default("open_credit"),
  currencyCode: z.string().min(1, "Currency code is required.").default("INR"),
  exchangeRate: z.number().positive().default(1),
  baseCurrencyAmount: z.number().nonnegative(),
});

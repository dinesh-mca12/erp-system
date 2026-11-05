import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required."),
  email: z.string().email("Invalid email address.").optional().or(z.literal("")),
  phone: z.string().optional(),
  gstin: z.string().max(15).optional(),
  pan: z.string().max(10).optional(),
  billingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  shippingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  creditLimit: z.number().nonnegative().optional(),
  outstandingBalance: z.number().optional().default(0),
  currencyCode: z.string().default("INR"),
});

export const updateCustomerSchema = createCustomerSchema.partial();

import { z } from "zod";

export const createVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required."),
  email: z.string().email("Invalid email address.").optional().or(z.literal("")),
  phone: z.string().optional(),
  gstin: z.string().max(15).optional(),
  pan: z.string().max(10).optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  rating: z.number().min(0).max(5).optional(),
  leadTimeDays: z.number().int().nonnegative().optional(),
  outstandingBalance: z.number().optional().default(0),
  currencyCode: z.string().default("INR"),
});

export const updateVendorSchema = createVendorSchema.partial();

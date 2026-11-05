import { z } from "zod";

export const registerCompanySchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  uid: z.string().optional(),
  password: z.string().optional(),
});

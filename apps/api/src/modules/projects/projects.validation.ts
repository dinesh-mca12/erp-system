import { z } from "zod";

export const createProjectSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  name: z.string().min(1, "Project name is required."),
  budgetHours: z.number().nonnegative().optional(),
  budgetAmount: z.number().nonnegative().optional(),
  billingType: z.enum(["fixed", "time_and_material"]),
  status: z.string().default("active"),
});

export const createTimesheetSchema = z.object({
  projectId: z.string().min(1, "Project ID is required."),
  date: z.any(),
  hours: z.number().positive("Hours must be greater than zero."),
  billable: z.boolean().default(true),
  invoiced: z.boolean().default(false),
});

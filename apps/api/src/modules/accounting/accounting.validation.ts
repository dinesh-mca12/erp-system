import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required."),
  code: z.string().min(1, "Account code is required."),
  type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  balance: z.number().default(0),
});

export const createJournalEntrySchema = z.object({
  entryNumber: z.string().min(1, "Entry number is required."),
  date: z.any(),
  description: z.string().min(1, "Description is required."),
  status: z.enum(["draft", "posted"]).default("draft"),
  lines: z.array(z.object({
    accountId: z.string().min(1, "Account ID is required."),
    debit: z.number().nonnegative(),
    credit: z.number().nonnegative(),
    description: z.string().optional(),
  })).min(2, "At least two entry lines are required."),
});

export const createFixedAssetSchema = z.object({
  name: z.string().min(1, "Asset name is required."),
  purchaseDate: z.any(),
  purchaseValue: z.number().positive(),
  depreciationMethod: z.enum(["straight_line", "written_down_value"]),
  usefulLifeMonths: z.number().positive(),
  currentBookValue: z.number().positive(),
});

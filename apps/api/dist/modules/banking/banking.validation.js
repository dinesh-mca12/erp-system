import { z } from "zod";
export const createBankAccountSchema = z.object({
    accountName: z.string().min(1, "Account name is required."),
    accountNumber: z.string().min(1, "Account number is required."),
    bankName: z.string().min(1, "Bank name is required."),
    balance: z.number().default(0),
    currencyCode: z.string().min(1).default("INR"),
});
export const createBankTransactionSchema = z.object({
    bankAccountId: z.string().min(1, "Bank account is required."),
    date: z.any(),
    description: z.string().min(1, "Description is required."),
    amount: z.number().positive("Amount must be positive."),
    type: z.enum(["deposit", "withdrawal"]),
    reconciled: z.boolean().default(false),
});
//# sourceMappingURL=banking.validation.js.map
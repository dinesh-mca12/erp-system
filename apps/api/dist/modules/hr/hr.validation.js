import { z } from "zod";
export const createEmployeeSchema = z.object({
    firstName: z.string().min(1, "First name is required."),
    lastName: z.string().min(1, "Last name is required."),
    email: z.string().email("Invalid email address."),
    phone: z.string().optional(),
    designation: z.string().min(1, "Designation is required."),
    department: z.string().min(1, "Department is required."),
    joiningDate: z.any(),
    monthlyBaseSalary: z.number().positive("Monthly base salary must be positive."),
    bankAccountNumber: z.string().optional(),
});
export const createPayslipSchema = z.object({
    employeeId: z.string().min(1, "Employee ID is required."),
    month: z.string().min(1, "Month is required."),
    year: z.number().positive(),
    baseSalary: z.number().nonnegative(),
    allowances: z.number().nonnegative().default(0),
    deductions: z.number().nonnegative().default(0),
    netSalary: z.number().nonnegative(),
    status: z.enum(["draft", "paid"]).default("draft"),
});
//# sourceMappingURL=hr.validation.js.map
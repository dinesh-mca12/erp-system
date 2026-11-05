import { z } from "zod";

export const createEmployeeProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Invalid email address."),
  phone: z.string().optional(),
  designation: z.string().min(1, "Designation is required."),
  department: z.string().min(1, "Department is required."),
  joiningDate: z.any(),
  monthlyBaseSalary: z.number().positive(),
  bankAccountNumber: z.string().optional(),

  // Extended Personal details
  emergencyContact: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),

  // Extended Employment details
  employeeType: z.string().default("Full-time"),
  employmentStatus: z.enum(["active", "inactive", "suspended"]).default("active"),
  reportingManager: z.string().optional(),
  branch: z.string().optional(),
  officeLocation: z.string().optional(),
  shift: z.string().optional(),
  workMode: z.enum(["office", "remote", "hybrid"]).default("office"),

  // Extended System details
  loginEmail: z.string().email().optional(),
  assignedRole: z.string().default("Employee"),
  assignedPermissions: z.array(z.string()).default([])
});

export const updateEmployeeProfileSchema = createEmployeeProfileSchema.partial();

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required."),
  departmentHead: z.string().optional(),
  assignedModules: z.array(z.string()).default([])
});

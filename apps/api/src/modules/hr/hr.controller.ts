import { Request, Response, NextFunction } from "express";
import { db } from "../../config/firebase.js";
import { Employee, Payslip } from "@flowos/shared-types";

// Fallback in-memory mock stores for offline mode
export const mockEmployeesStore = new Map<string, Employee[]>();
export const mockPayslipsStore = new Map<string, Payslip[]>();

// Seeding Default Employees if empty
export const seedDefaultEmployees = (companyId: string): Employee[] => {
  const defaults: Omit<Employee, "id" | "companyId" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "isDeleted">[] = [
    {
      firstName: "Vikram",
      lastName: "Malhotra",
      email: "vikram@flowos.io",
      phone: "+919876543210",
      designation: "Senior Platform Architect",
      department: "Engineering",
      joiningDate: new Date("2024-01-15"),
      monthlyBaseSalary: 120000,
      bankAccountNumber: "501004829104"
    },
    {
      firstName: "Anjali",
      lastName: "Sharma",
      email: "anjali@flowos.io",
      phone: "+919876543211",
      designation: "Product Design Lead",
      department: "UX Design",
      joiningDate: new Date("2024-06-01"),
      monthlyBaseSalary: 95000,
      bankAccountNumber: "30291048291"
    }
  ];

  const seeded: Employee[] = defaults.map((emp, idx) => ({
    id: `emp_seed_${idx + 1}`,
    ...emp,
    companyId,
    createdAt: new Date(),
    createdBy: "system",
    updatedAt: new Date(),
    updatedBy: "system",
    isDeleted: false
  }));

  mockEmployeesStore.set(companyId, seeded);
  return seeded;
};

export const getEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let employees: Employee[] = [];
    try {
      const snapshot = await db.collection("employees").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching employees from mock store.");
    }

    if (employees.length === 0) {
      if (!mockEmployeesStore.has(companyId)) {
        seedDefaultEmployees(companyId);
      }
      employees = (mockEmployeesStore.get(companyId) || []).filter(e => !e.isDeleted);
    }

    res.json({ success: true, data: employees, meta: { total: employees.length }, error: null });
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const newEmp: Omit<Employee, "id"> = {
      ...req.body,
      companyId,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false,
    };

    let created: Employee;
    try {
      const docRef = await db.collection("employees").add(newEmp);
      created = { id: docRef.id, ...newEmp } as Employee;
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, writing employee to mock store.");
      const id = "emp_" + Math.random().toString(36).substring(2, 9);
      created = { id, ...newEmp } as Employee;

      const list = mockEmployeesStore.get(companyId) || [];
      list.push(created);
      mockEmployeesStore.set(companyId, list);
    }

    res.status(201).json({ success: true, data: created, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

export const getPayslips = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let payslips: Payslip[] = [];
    try {
      const snapshot = await db.collection("payslips").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      payslips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payslip));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching payslips from mock store.");
      payslips = (mockPayslipsStore.get(companyId) || []).filter(p => !p.isDeleted);
    }

    res.json({ success: true, data: payslips, meta: { total: payslips.length }, error: null });
  } catch (error) {
    next(error);
  }
};

export const generateMonthlyPayslip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const { employeeId, month, year, allowances = 0, deductions = 0, status = "draft" } = req.body;

    // 1. Fetch Employee base salary
    let empBaseSalary = 0;
    try {
      const doc = await db.collection("employees").doc(employeeId).get();
      if (doc.exists && doc.data()?.companyId === companyId) {
        empBaseSalary = doc.data()?.monthlyBaseSalary || 0;
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, checking employee in mock store.");
      const emp = (mockEmployeesStore.get(companyId) || []).find(e => e.id === employeeId);
      if (emp) {
        empBaseSalary = emp.monthlyBaseSalary;
      }
    }

    if (empBaseSalary === 0) {
      res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Employee not found." } });
      return;
    }

    // Calculate Net Payout
    const netSalary = empBaseSalary + allowances - deductions;

    const newPayslip: Omit<Payslip, "id"> = {
      employeeId,
      month,
      year,
      baseSalary: empBaseSalary,
      allowances,
      deductions,
      netSalary,
      status,
      companyId,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false,
    };

    let created: Payslip;
    try {
      const docRef = await db.collection("payslips").add(newPayslip);
      created = { id: docRef.id, ...newPayslip } as Payslip;
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, writing payslip to mock store.");
      const id = "ps_" + Math.random().toString(36).substring(2, 9);
      created = { id, ...newPayslip } as Payslip;

      const list = mockPayslipsStore.get(companyId) || [];
      list.push(created);
      mockPayslipsStore.set(companyId, list);
    }

    res.status(201).json({ success: true, data: created, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};
export const createPayslip = generateMonthlyPayslip;

import { Request, Response, NextFunction } from "express";
import { db } from "../../config/firebase.js";
import { Employee, Department } from "@flowos/shared-types";
import { mockEmployeesStore, seedDefaultEmployees } from "../hr/hr.controller.js";

// Fallback in-memory store for Departments
export const mockDepartmentsStore = new Map<string, Department[]>();

const seedDefaultDepartments = (companyId: string): Department[] => {
  const defaults = [
    { name: "Accounting", departmentHead: "Vikram Malhotra", assignedModules: ["accounting", "banking"] },
    { name: "Sales", assignedModules: ["sales"] },
    { name: "HR & Payroll", assignedModules: ["hr"] },
    { name: "Inventory Control", assignedModules: ["inventory"] },
    { name: "IT Operations", assignedModules: ["it"] }
  ];

  const seeded: Department[] = defaults.map((dept, idx) => ({
    id: `dept_seed_${idx + 1}`,
    ...dept,
    companyId,
    createdAt: new Date(),
    createdBy: "system",
    updatedAt: new Date(),
    updatedBy: "system",
    isDeleted: false
  }));

  mockDepartmentsStore.set(companyId, seeded);
  return seeded;
};

// ----------------------------------------------------
// EMPLOYEES CRUD
// ----------------------------------------------------
export const getEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let employees: Employee[] = [];
    try {
      const snap = await db.collection("employees").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      employees = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching employees from mock store.");
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

    const employeeId = `EMP-${1000 + Math.floor(Math.random() * 9000)}`;
    const newEmp: Omit<Employee, "id"> = {
      ...req.body,
      employeeId,
      companyId,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false
    };

    let created: Employee;
    try {
      const docRef = await db.collection("employees").add(newEmp);
      created = { id: docRef.id, ...newEmp } as Employee;
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, adding employee to mock store.");
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

export const updateEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let updated: Employee | null = null;
    try {
      const ref = db.collection("employees").doc(id);
      await ref.update({ ...req.body, updatedAt: new Date() });
      const doc = await ref.get();
      updated = { id: doc.id, ...doc.data() } as Employee;
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, updating employee in mock store.");
      const list = mockEmployeesStore.get(companyId) || [];
      const idx = list.findIndex(e => e.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...req.body, updatedAt: new Date() };
        updated = list[idx];
        mockEmployeesStore.set(companyId, list);
      }
    }

    if (!updated) {
      res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Employee profile not found." } });
      return;
    }

    res.json({ success: true, data: updated, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let success = false;
    try {
      const ref = db.collection("employees").doc(id);
      await ref.update({ isDeleted: true, updatedAt: new Date() });
      success = true;
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, soft deleting employee in mock store.");
      const list = mockEmployeesStore.get(companyId) || [];
      const idx = list.findIndex(e => e.id === id);
      if (idx !== -1) {
        list[idx].isDeleted = true;
        mockEmployeesStore.set(companyId, list);
        success = true;
      }
    }

    res.json({ success, data: null, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------
// DEPARTMENTS CRUD
// ----------------------------------------------------
export const getDepartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let list: Department[] = [];
    try {
      const snap = await db.collection("departments").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, loading departments from mock store.");
      if (!mockDepartmentsStore.has(companyId)) {
        seedDefaultDepartments(companyId);
      }
      list = (mockDepartmentsStore.get(companyId) || []).filter(d => !d.isDeleted);
    }

    res.json({ success: true, data: list, meta: { total: list.length }, error: null });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const newDept: Omit<Department, "id"> = {
      ...req.body,
      companyId,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false
    };

    let created: Department;
    try {
      const docRef = await db.collection("departments").add(newDept);
      created = { id: docRef.id, ...newDept } as Department;
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, adding department to mock store.");
      const id = "dept_" + Math.random().toString(36).substring(2, 9);
      created = { id, ...newDept } as Department;

      const list = mockDepartmentsStore.get(companyId) || [];
      list.push(created);
      mockDepartmentsStore.set(companyId, list);
    }

    res.status(201).json({ success: true, data: created, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

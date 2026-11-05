import { db } from "../../config/firebase.js";
import { mockEmployeesStore, seedDefaultEmployees } from "../hr/hr.controller.js";
// Fallback in-memory store for Departments
export const mockDepartmentsStore = new Map();
const seedDefaultDepartments = (companyId) => {
    const defaults = [
        { name: "Accounting", departmentHead: "Vikram Malhotra", assignedModules: ["accounting", "banking"] },
        { name: "Sales", assignedModules: ["sales"] },
        { name: "HR & Payroll", assignedModules: ["hr"] },
        { name: "Inventory Control", assignedModules: ["inventory"] },
        { name: "IT Operations", assignedModules: ["it"] }
    ];
    const seeded = defaults.map((dept, idx) => ({
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
export const getEmployees = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let employees = [];
        try {
            const snap = await db.collection("employees").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
            employees = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, fetching employees from mock store.");
            if (!mockEmployeesStore.has(companyId)) {
                seedDefaultEmployees(companyId);
            }
            employees = (mockEmployeesStore.get(companyId) || []).filter(e => !e.isDeleted);
        }
        res.json({ success: true, data: employees, meta: { total: employees.length }, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const createEmployee = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "system";
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        const employeeId = `EMP-${1000 + Math.floor(Math.random() * 9000)}`;
        const newEmp = {
            ...req.body,
            employeeId,
            companyId,
            createdAt: new Date(),
            createdBy: userId,
            updatedAt: new Date(),
            updatedBy: userId,
            isDeleted: false
        };
        let created;
        try {
            const docRef = await db.collection("employees").add(newEmp);
            created = { id: docRef.id, ...newEmp };
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, adding employee to mock store.");
            const id = "emp_" + Math.random().toString(36).substring(2, 9);
            created = { id, ...newEmp };
            const list = mockEmployeesStore.get(companyId) || [];
            list.push(created);
            mockEmployeesStore.set(companyId, list);
        }
        res.status(201).json({ success: true, data: created, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const updateEmployee = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const { id } = req.params;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let updated = null;
        try {
            const ref = db.collection("employees").doc(id);
            await ref.update({ ...req.body, updatedAt: new Date() });
            const doc = await ref.get();
            updated = { id: doc.id, ...doc.data() };
        }
        catch (e) {
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
    }
    catch (error) {
        next(error);
    }
};
export const deleteEmployee = async (req, res, next) => {
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
        }
        catch (e) {
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
    }
    catch (error) {
        next(error);
    }
};
// ----------------------------------------------------
// DEPARTMENTS CRUD
// ----------------------------------------------------
export const getDepartments = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let list = [];
        try {
            const snap = await db.collection("departments").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
            list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, loading departments from mock store.");
            if (!mockDepartmentsStore.has(companyId)) {
                seedDefaultDepartments(companyId);
            }
            list = (mockDepartmentsStore.get(companyId) || []).filter(d => !d.isDeleted);
        }
        res.json({ success: true, data: list, meta: { total: list.length }, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const createDepartment = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "system";
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        const newDept = {
            ...req.body,
            companyId,
            createdAt: new Date(),
            createdBy: userId,
            updatedAt: new Date(),
            updatedBy: userId,
            isDeleted: false
        };
        let created;
        try {
            const docRef = await db.collection("departments").add(newDept);
            created = { id: docRef.id, ...newDept };
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, adding department to mock store.");
            const id = "dept_" + Math.random().toString(36).substring(2, 9);
            created = { id, ...newDept };
            const list = mockDepartmentsStore.get(companyId) || [];
            list.push(created);
            mockDepartmentsStore.set(companyId, list);
        }
        res.status(201).json({ success: true, data: created, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=employees.controller.js.map
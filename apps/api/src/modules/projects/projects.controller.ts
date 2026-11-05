import { Request, Response, NextFunction } from "express";
import { db } from "../../config/firebase.js";
import { Project, TimesheetEntry } from "@flowos/shared-types";

// Fallback in-memory mock stores for offline mode
export const mockProjectsStore = new Map<string, Project[]>();
export const mockTimesheetsStore = new Map<string, TimesheetEntry[]>();

const seedDefaultProjects = (companyId: string): Project[] => {
  const defaults: Omit<Project, "id" | "companyId" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "isDeleted">[] = [
    {
      customerId: "cust_seed_1",
      name: "Server Infrastructure Deployment",
      budgetHours: 200,
      budgetAmount: 2400000,
      billingType: "time_and_material"
    },
    {
      customerId: "cust_seed_2",
      name: "Tata Steel ERP Advisory Phase 1",
      budgetHours: 80,
      budgetAmount: 800000,
      billingType: "fixed"
    }
  ];

  const seeded: Project[] = defaults.map((p, idx) => ({
    id: `proj_seed_${idx + 1}`,
    ...p,
    companyId,
    createdAt: new Date(),
    createdBy: "system",
    updatedAt: new Date(),
    updatedBy: "system",
    isDeleted: false
  }));

  mockProjectsStore.set(companyId, seeded);
  return seeded;
};

const seedDefaultTimesheets = (companyId: string): TimesheetEntry[] => {
  const defaults: Omit<TimesheetEntry, "id" | "companyId" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "isDeleted">[] = [
    {
      projectId: "proj_seed_1",
      userId: "emp_seed_1",
      date: new Date(),
      hours: 8,
      billable: true,
      invoiced: false
    },
    {
      projectId: "proj_seed_2",
      userId: "emp_seed_1",
      date: new Date(),
      hours: 6,
      billable: true,
      invoiced: false
    }
  ];

  const seeded: TimesheetEntry[] = defaults.map((t, idx) => ({
    id: `time_seed_${idx + 1}`,
    ...t,
    companyId,
    createdAt: new Date(),
    createdBy: "system",
    updatedAt: new Date(),
    updatedBy: "system",
    isDeleted: false
  }));

  mockTimesheetsStore.set(companyId, seeded);
  return seeded;
};

// ==========================================
// PROJECTS
// ==========================================
export const getProjects = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let projects: Project[] = [];
    try {
      const snapshot = await db.collection("projects").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching projects from mock store.");
      if (!mockProjectsStore.has(companyId)) {
        seedDefaultProjects(companyId);
      }
      projects = (mockProjectsStore.get(companyId) || []).filter(p => !p.isDeleted);
    }

    res.json({ success: true, data: projects, meta: { total: projects.length }, error: null });
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const newProjectData: Omit<Project, "id"> = {
      ...req.body,
      companyId,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false,
    };

    let createdProject: Project;
    try {
      const docRef = await db.collection("projects").add(newProjectData);
      createdProject = { id: docRef.id, ...newProjectData } as Project;
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, writing project to mock store.");
      const id = "proj_" + Math.random().toString(36).substring(2, 9);
      createdProject = { id, ...newProjectData } as Project;

      const list = mockProjectsStore.get(companyId) || [];
      list.push(createdProject);
      mockProjectsStore.set(companyId, list);
    }

    res.status(201).json({ success: true, data: createdProject, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// TIMESHEETS
// ==========================================
export const getTimesheets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let entries: TimesheetEntry[] = [];
    try {
      const snapshot = await db.collection("timesheets").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimesheetEntry));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching timesheets from mock store.");
      if (!mockTimesheetsStore.has(companyId)) {
        seedDefaultTimesheets(companyId);
      }
      entries = (mockTimesheetsStore.get(companyId) || []).filter(t => !t.isDeleted);
    }

    res.json({ success: true, data: entries, meta: { total: entries.length }, error: null });
  } catch (error) {
    next(error);
  }
};

export const createTimesheet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const newTimesheetData: Omit<TimesheetEntry, "id"> = {
      ...req.body,
      companyId,
      userId,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false,
    };

    let createdEntry: TimesheetEntry;
    try {
      const docRef = await db.collection("timesheets").add(newTimesheetData);
      createdEntry = { id: docRef.id, ...newTimesheetData } as TimesheetEntry;
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, writing timesheet to mock store.");
      const id = "time_" + Math.random().toString(36).substring(2, 9);
      createdEntry = { id, ...newTimesheetData } as TimesheetEntry;

      const list = mockTimesheetsStore.get(companyId) || [];
      list.push(createdEntry);
      mockTimesheetsStore.set(companyId, list);
    }

    res.status(201).json({ success: true, data: createdEntry, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

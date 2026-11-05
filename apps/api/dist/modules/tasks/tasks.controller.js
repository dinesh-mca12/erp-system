import { db } from "../../config/firebase.js";
export const mockTasksStore = new Map();
const seedDefaultTasks = (companyId) => {
    const defaults = [
        {
            taskId: "T-1001",
            title: "Reconcile Q2 Banking ledger",
            description: "Verify matched transactions against the Cash Account and file reconciliation report.",
            priority: "high",
            department: "Accounting",
            assignedBy: "system",
            assignedTo: "emp_seed_1",
            dueDate: "2026-08-15",
            estimatedHours: 8,
            progress: 35,
            status: "in_progress",
            comments: [
                { userId: "system", userName: "System Bot", text: "Task automatically created on audit request.", createdAt: new Date().toISOString() }
            ]
        },
        {
            taskId: "T-1002",
            title: "Audit Warehouse stock levels",
            description: "Perform physical stock count at Mumbai Central and log stock adjustments.",
            priority: "medium",
            department: "Inventory Control",
            assignedBy: "system",
            assignedTo: "emp_seed_1",
            dueDate: "2026-08-20",
            estimatedHours: 6,
            progress: 100,
            status: "completed",
            comments: []
        }
    ];
    const seeded = defaults.map((task, idx) => ({
        id: `task_seed_${idx + 1}`,
        ...task,
        companyId,
        createdAt: new Date(),
        createdBy: "system",
        updatedAt: new Date(),
        updatedBy: "system",
        isDeleted: false
    }));
    mockTasksStore.set(companyId, seeded);
    return seeded;
};
export const getTasks = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let tasks = [];
        try {
            const snap = await db.collection("tasks").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
            tasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, fetching tasks from mock store.");
            if (!mockTasksStore.has(companyId)) {
                seedDefaultTasks(companyId);
            }
            tasks = (mockTasksStore.get(companyId) || []).filter(t => !t.isDeleted);
        }
        res.json({ success: true, data: tasks, meta: { total: tasks.length }, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const createTask = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "system";
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        const taskId = `T-${1000 + Math.floor(Math.random() * 9000)}`;
        const newTask = {
            ...req.body,
            taskId,
            assignedBy: userId,
            companyId,
            comments: [],
            createdAt: new Date(),
            createdBy: userId,
            updatedAt: new Date(),
            updatedBy: userId,
            isDeleted: false
        };
        let created;
        try {
            const docRef = await db.collection("tasks").add(newTask);
            created = { id: docRef.id, ...newTask };
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, adding task to mock store.");
            const id = "task_" + Math.random().toString(36).substring(2, 9);
            created = { id, ...newTask };
            const list = mockTasksStore.get(companyId) || [];
            list.push(created);
            mockTasksStore.set(companyId, list);
        }
        res.status(201).json({ success: true, data: created, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const updateTask = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "system";
        const { id } = req.params;
        const { comment, ...updateFields } = req.body;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let updated = null;
        try {
            const ref = db.collection("tasks").doc(id);
            const doc = await ref.get();
            if (doc.exists && doc.data()?.companyId === companyId) {
                const currentComments = doc.data()?.comments || [];
                if (comment) {
                    currentComments.push({
                        userId,
                        userName: req.user?.email || "Manager",
                        text: comment,
                        createdAt: new Date().toISOString()
                    });
                }
                await ref.update({
                    ...updateFields,
                    comments: currentComments,
                    updatedAt: new Date()
                });
                const freshDoc = await ref.get();
                updated = { id: freshDoc.id, ...freshDoc.data() };
            }
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, updating task in mock store.");
            const list = mockTasksStore.get(companyId) || [];
            const idx = list.findIndex(t => t.id === id);
            if (idx !== -1) {
                const t = list[idx];
                const comments = t.comments || [];
                if (comment) {
                    comments.push({
                        userId,
                        userName: req.user?.email || "Manager",
                        text: comment,
                        createdAt: new Date().toISOString()
                    });
                }
                list[idx] = {
                    ...t,
                    ...updateFields,
                    comments,
                    updatedAt: new Date()
                };
                updated = list[idx];
                mockTasksStore.set(companyId, list);
            }
        }
        if (!updated) {
            res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Task not found." } });
            return;
        }
        res.json({ success: true, data: updated, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const deleteTask = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const { id } = req.params;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let success = false;
        try {
            const ref = db.collection("tasks").doc(id);
            await ref.update({ isDeleted: true, updatedAt: new Date() });
            success = true;
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, soft deleting task in mock store.");
            const list = mockTasksStore.get(companyId) || [];
            const idx = list.findIndex(t => t.id === id);
            if (idx !== -1) {
                list[idx].isDeleted = true;
                mockTasksStore.set(companyId, list);
                success = true;
            }
        }
        res.json({ success, data: null, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=tasks.controller.js.map
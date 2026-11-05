import { z } from "zod";
export const createTaskSchema = z.object({
    title: z.string().min(1, "Task title is required."),
    description: z.string().min(1, "Task description is required."),
    priority: z.enum(["low", "medium", "high", "critical"]),
    department: z.string().min(1, "Department is required."),
    assignedTo: z.string().min(1, "Assigned user is required."),
    dueDate: z.string().min(1, "Due date is required."),
    estimatedHours: z.number().nonnegative().optional(),
    progress: z.number().min(0).max(100).default(0),
    status: z.enum(["pending", "assigned", "in_progress", "under_review", "completed", "reopened", "cancelled"]).default("pending")
});
export const updateTaskSchema = createTaskSchema.partial().extend({
    comment: z.string().optional()
});
//# sourceMappingURL=tasks.validation.js.map
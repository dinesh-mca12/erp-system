import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  Plus,
  RefreshCw,
  X,
  MessageSquare,
  Clock,
} from "lucide-react";
import { Task, Employee } from "@flowos/shared-types";

export default function TasksTab() {
  const token = useAppSelector((state) => state.auth.token);
  const queryClient = useQueryClient();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Task creation form
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [department, setDepartment] = useState("Accounting");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");

  // Comment form
  const [newComment, setNewComment] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Queries
  const { data: tasks = [], refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ["tasks", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/tasks", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/employees", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsTaskModalOpen(false);
      showToast("✓ Work task assigned successfully.");
      setTitle("");
      setDescription("");
      setDueDate("");
      setEstimatedHours("");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const r = await fetch(`/api/v1/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      return r.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      showToast("✓ Task status/comment updated.");
      if (selectedTask && res.data) {
        setSelectedTask(res.data);
      }
      setNewComment("");
    },
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate({
      title,
      description,
      priority,
      department,
      assignedTo,
      dueDate,
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      progress: 0,
      status: "assigned"
    });
  };

  const handleUpdateStatus = (task: Task, status: string) => {
    updateTaskMutation.mutate({
      id: task.id,
      payload: { status }
    });
  };

  const handleUpdateProgress = (task: Task, progress: number) => {
    updateTaskMutation.mutate({
      id: task.id,
      payload: { progress }
    });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newComment) return;
    updateTaskMutation.mutate({
      id: selectedTask.id,
      payload: { comment: newComment }
    });
  };

  return (
    <div className="p-6 flex flex-col gap-6 w-full">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 glass-card px-5 py-3 rounded-lg border-brand-500/30 shadow-lg shadow-brand-500/10 animate-bounce flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200">{toastMessage}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-wide text-slate-200">Work & Task Assignments</h2>
          <p className="text-xs text-slate-400 mt-1">Assign projects, monitor team progression, and log milestone updates.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:translate-y-0.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10"
          >
            <Plus className="h-4 w-4" />
            <span>Create Task</span>
          </button>
          <button
            onClick={() => refetchTasks()}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* BODY PANEL */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-[60vh]">
        {/* TASK BOARD (LEFT) */}
        <div className="flex-1 overflow-y-auto max-h-[60vh] pr-1 flex flex-col gap-4">
          {tasks.map(task => {
            const assignee = employees.find(e => e.id === task.assignedTo || e.employeeId === task.assignedTo);
            const assigneeName = assignee ? `${assignee.firstName} ${assignee.lastName}` : "Unassigned";

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`glass-card p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-3 ${
                  selectedTask?.id === task.id ? "border-brand-500 bg-slate-900/40" : "border-white/5 hover:border-white/10"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                      {task.taskId}
                    </span>
                    <h3 className="font-bold text-sm text-slate-200 mt-1.5">{task.title}</h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    task.priority === "critical" ? "bg-rose-500/15 text-rose-400 border border-rose-500/20" :
                    task.priority === "high" ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "bg-white/5 text-slate-400"
                  }`}>
                    {task.priority}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>

                {/* Progress bar */}
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Task Completion</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${task.progress}%` }}></div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-slate-500 font-mono">
                  <span>Owner: <strong className="text-slate-300">{assigneeName}</strong></span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Due: {task.dueDate}</span>
                  </span>
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No assigned tasks registered.</p>}
        </div>

        {/* DETAILS PANEL (RIGHT) */}
        {selectedTask && (
          <div className="w-96 glass-card p-5 rounded-2xl border border-white/10 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-bold text-sm text-slate-200">Assignment Details</h3>
              <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-white p-0.5">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">{selectedTask.taskId}</span>
              <h4 className="font-bold text-slate-100 text-sm">{selectedTask.title}</h4>
              <p className="text-xs text-slate-400 mt-2">{selectedTask.description}</p>
            </div>

            {/* Config controls */}
            <div className="flex flex-col gap-3 border-t border-b border-white/5 py-4 text-xs text-slate-400">
              <div className="flex justify-between items-center">
                <span>Task Status</span>
                <select
                  value={selectedTask.status}
                  onChange={(e) => handleUpdateStatus(selectedTask, e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-slate-300 focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="under_review">Under Review</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex justify-between items-center">
                <span>Set Progress</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedTask.progress}
                  onChange={(e) => handleUpdateProgress(selectedTask, Number(e.target.value))}
                  className="w-32 accent-brand-500"
                />
              </div>

              {selectedTask.estimatedHours && (
                <div className="flex justify-between">
                  <span>Est. Timeline</span>
                  <span className="text-slate-200">{selectedTask.estimatedHours} hours</span>
                </div>
              )}
            </div>

            {/* Comments List */}
            <div className="flex flex-col gap-3 flex-1 overflow-hidden">
              <h5 className="font-bold text-xs text-slate-300 flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                <span>Comments & Timeline</span>
              </h5>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[20vh] pr-1 font-mono text-[10px] text-slate-400">
                {selectedTask.comments?.map((c, i) => (
                  <div key={i} className="bg-slate-950/20 p-2.5 rounded-lg border border-white/5">
                    <div className="flex justify-between text-slate-500 font-bold mb-1">
                      <span>{c.userName}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-200 font-sans">{c.text}</p>
                  </div>
                ))}
                {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                  <p className="text-[10px] text-slate-600 italic">No comments added.</p>
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Post update note..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-xs font-bold rounded-lg text-white"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ASSIGN TASK MODAL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-base font-bold text-slate-200">Assign New Work Item</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold">Task Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Audit warehouse balances"
                  className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:border-brand-500 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold">Task Description</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail parameters and verification checklists..."
                  className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:border-brand-500 outline-none min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-300 focus:border-brand-500 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold">Target Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-300 focus:border-brand-500 outline-none"
                  >
                    <option value="Accounting">Accounting</option>
                    <option value="Sales">Sales</option>
                    <option value="HR & Payroll">HR & Payroll</option>
                    <option value="Inventory Control">Inventory Control</option>
                    <option value="IT Operations">IT Operations</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold">Assign To (Staff)</label>
                  <select
                    value={assignedTo}
                    required
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-300 focus:border-brand-500 outline-none"
                  >
                    <option value="">Select Assignee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-300 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold">Estimated Hours</label>
                <input
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="e.g. 12"
                  className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:border-brand-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="mt-2 w-full py-2.5 bg-brand-600 hover:bg-brand-500 rounded-lg text-white font-bold transition-colors"
              >
                {createTaskMutation.isPending ? "Assigning Task..." : "Post & Assign Task"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

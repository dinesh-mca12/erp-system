import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  Plus,
  RefreshCw,
  Clock,
  X,
} from "lucide-react";
import { Project, TimesheetEntry, Customer } from "@flowos/shared-types";

export default function ProjectsTab() {
  const token = useAppSelector((state) => state.auth.token);
  const queryClient = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState<"projects" | "timesheets">("projects");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTimesheetModalOpen, setIsTimesheetModalOpen] = useState(false);

  // Queries
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/customers", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: projects = [], refetch: refetchProjects } = useQuery<Project[]>({
    queryKey: ["projects", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/projects", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: timesheets = [], refetch: refetchTimesheets } = useQuery<TimesheetEntry[]>({
    queryKey: ["timesheets", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/projects/timesheets", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to create project");
      return r.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsProjectModalOpen(false);
      showToast(`✓ Project "${res.data.name}" registered successfully.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  const createTimesheetMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/projects/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to log timesheet");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      setIsTimesheetModalOpen(false);
      showToast(`✓ Tracked ${payloadHours} hours on timesheet.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  // Project Form states
  const [projName, setProjName] = useState("");
  const [projCustomerId, setProjCustomerId] = useState("");
  const [projBillingType, setProjBillingType] = useState<"fixed" | "time_and_material">("fixed");
  const [projBudgetHours, setProjBudgetHours] = useState("");
  const [projBudgetAmount, setProjBudgetAmount] = useState("");

  // Timesheet Form states
  const [tsProjectId, setTsProjectId] = useState("");
  const [tsHours, setTsHours] = useState("");
  const [tsDate, setTsDate] = useState("");
  const [tsBillable, setTsBillable] = useState(true);
  const [payloadHours, setPayloadHours] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName || !projCustomerId) return;

    createProjectMutation.mutate({
      name: projName,
      customerId: projCustomerId,
      billingType: projBillingType,
      budgetHours: projBudgetHours ? Number(projBudgetHours) : undefined,
      budgetAmount: projBudgetAmount ? Number(projBudgetAmount) : undefined,
      status: "active"
    });
  };

  const handleCreateTimesheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tsProjectId || !tsHours || !tsDate) return;

    setPayloadHours(tsHours);
    createTimesheetMutation.mutate({
      projectId: tsProjectId,
      date: tsDate,
      hours: Number(tsHours),
      billable: tsBillable,
      invoiced: false
    });
  };

  // Helper calculation
  const getProjectTrackedHours = (projectId: string) => {
    return timesheets
      .filter(t => t.projectId === projectId)
      .reduce((sum, current) => sum + current.hours, 0);
  };

  return (
    <div className="p-6 flex flex-col gap-6 w-full">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 glass-card px-5 py-3 rounded-lg border-brand-500/30 shadow-lg shadow-brand-500/10 flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">{toastMessage}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-wide text-slate-200">Projects & Timesheets</h2>
          <p className="text-xs text-slate-400 mt-1">Configure client projects, register tasks, log employee timesheets, and run payroll tracks.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeSubTab === "projects") {
                setProjName("");
                setProjCustomerId("");
                setProjBudgetHours("");
                setProjBudgetAmount("");
                setIsProjectModalOpen(true);
              } else {
                setTsProjectId("");
                setTsHours("");
                setTsDate(new Date().toISOString().split("T")[0]);
                setIsTimesheetModalOpen(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:translate-y-0.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10"
          >
            <Plus className="h-4 w-4" />
            <span>Create {activeSubTab === "projects" ? "Project" : "Time Log"}</span>
          </button>
          <button
            onClick={() => {
              refetchProjects();
              refetchTimesheets();
            }}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* SUB TABS */}
      <div className="flex border-b border-white/5 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveSubTab("projects")}
          className={`pb-3 transition-colors ${activeSubTab === "projects" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Active Projects
        </button>
        <button
          onClick={() => setActiveSubTab("timesheets")}
          className={`pb-3 transition-colors ${activeSubTab === "timesheets" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Timesheet Logs
        </button>
      </div>

      {/* CONTENTS */}
      <div className="flex-1 overflow-y-auto max-h-[65vh] pr-1">
        {activeSubTab === "projects" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(proj => {
              const cust = customers.find(c => c.id === proj.customerId);
              const tracked = getProjectTrackedHours(proj.id);
              const progress = proj.budgetHours ? (tracked / proj.budgetHours) * 100 : 0;
              return (
                <div key={proj.id} className="glass-card p-5 rounded-2xl border border-white/5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-200 font-display text-base">{proj.name}</h4>
                      <p className="text-xs text-slate-400 mt-1">Client: {cust ? cust.name : "Internal"}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 uppercase">
                      {proj.billingType.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Logged Hours</span>
                      <span className="text-slate-200 font-semibold">{tracked} hrs {proj.budgetHours ? `/ ${proj.budgetHours} hrs` : ""}</span>
                    </div>
                    {proj.budgetHours && (
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${Math.min(100, progress)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && <p className="text-xs text-slate-500 text-center py-8 col-span-2">No projects running.</p>}
          </div>
        )}

        {activeSubTab === "timesheets" && (
          <div className="flex flex-col gap-3">
            {timesheets.map(ts => {
              const proj = projects.find(p => p.id === ts.projectId);
              return (
                <div key={ts.id} className="glass-card p-4 rounded-xl flex items-center justify-between border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold font-display text-slate-200">{proj ? proj.name : "General Task"}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Logged: {new Date(ts.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right font-display font-bold text-slate-200 text-sm">
                      {ts.hours} hrs
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ts.billable ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
                      {ts.billable ? "BILLABLE" : "NON-BILLABLE"}
                    </span>
                  </div>
                </div>
              );
            })}
            {timesheets.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No log sheets logged.</p>}
          </div>
        )}
      </div>

      {/* CREATE PROJECT MODAL */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold font-display text-slate-200">Register New Project</h3>
              <button onClick={() => setIsProjectModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="flex flex-col gap-4 text-sm text-slate-300">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Project Name</label>
                <input
                  type="text"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Customer Link</label>
                <select
                  value={projCustomerId}
                  onChange={(e) => setProjCustomerId(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Billing System</label>
                <select
                  value={projBillingType}
                  onChange={(e) => setProjBillingType(e.target.value as any)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                >
                  <option value="fixed">Fixed Price</option>
                  <option value="time_and_material">Time & Materials</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Budget Hours</label>
                  <input
                    type="number"
                    value={projBudgetHours}
                    onChange={(e) => setProjBudgetHours(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Budget Fee (₹)</label>
                  <input
                    type="number"
                    value={projBudgetAmount}
                    onChange={(e) => setProjBudgetAmount(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createProjectMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors mt-2"
              >
                {createProjectMutation.isPending ? "Creating..." : "Save Project"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TIMESHEET MODAL */}
      {isTimesheetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold font-display text-slate-200">Log Tracked Time</h3>
              <button onClick={() => setIsTimesheetModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateTimesheet} className="flex flex-col gap-4 text-sm text-slate-300">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Select Project</label>
                <select
                  value={tsProjectId}
                  onChange={(e) => setTsProjectId(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                >
                  <option value="">Select Project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Date Logged</label>
                  <input
                    type="date"
                    value={tsDate}
                    onChange={(e) => setTsDate(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Duration (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={tsHours}
                    onChange={(e) => setTsHours(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="billable_check"
                  checked={tsBillable}
                  onChange={(e) => setTsBillable(e.target.checked)}
                  className="h-4 w-4 bg-slate-900 rounded border-white/10 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="billable_check" className="text-xs font-semibold text-slate-300">This work is billable to customer</label>
              </div>

              <button
                type="submit"
                disabled={createTimesheetMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors mt-2"
              >
                {createTimesheetMutation.isPending ? "Logging..." : "Log Hours"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  Users,
  Plus,
  RefreshCw,
  X,
  Building2,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import { Employee, Department } from "@flowos/shared-types";

export default function EmployeeTab() {
  const token = useAppSelector((state) => state.auth.token);
  const queryClient = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState<"directory" | "departments" | "rbac">("directory");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [monthlyBaseSalary, setMonthlyBaseSalary] = useState("");
  const [workMode, setWorkMode] = useState<"office" | "remote" | "hybrid">("office");
  const [assignedRole, setAssignedRole] = useState("Employee");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Queries
  const { data: employees = [], refetch: refetchEmployees } = useQuery<Employee[]>({
    queryKey: ["employees", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/employees", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: departments = [], refetch: refetchDepts } = useQuery<Department[]>({
    queryKey: ["departments", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/employees/departments", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  // Mutations
  const createEmpMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to create employee");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setIsEmpModalOpen(false);
      showToast("✓ Employee profile registered successfully.");
      // Clear fields
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setDesignation("");
      setDepartment("");
      setMonthlyBaseSalary("");
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  const updateEmpMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const r = await fetch(`/api/v1/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      showToast("✓ Employee details updated.");
    },
  });

  const handleCreateEmp = (e: React.FormEvent) => {
    e.preventDefault();
    createEmpMutation.mutate({
      firstName,
      lastName,
      email,
      phone,
      designation,
      department,
      monthlyBaseSalary: Number(monthlyBaseSalary),
      joiningDate: new Date().toISOString(),
      workMode,
      assignedRole,
    });
  };

  const handleStatusToggle = (emp: Employee) => {
    const nextStatus = emp.employmentStatus === "active" ? "suspended" : "active";
    updateEmpMutation.mutate({
      id: emp.id,
      payload: { employmentStatus: nextStatus }
    });
  };

  const handleRoleChange = (emp: Employee, role: string) => {
    updateEmpMutation.mutate({
      id: emp.id,
      payload: { assignedRole: role }
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
          <h2 className="text-2xl font-bold font-display tracking-wide text-slate-200">Staff & HR Management</h2>
          <p className="text-xs text-slate-400 mt-1">Manage employee profiles, roles, permissions and department structures.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeSubTab === "directory" && (
            <button
              onClick={() => setIsEmpModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:translate-y-0.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10"
            >
              <Plus className="h-4 w-4" />
              <span>Create Employee</span>
            </button>
          )}
          <button
            onClick={() => {
              refetchEmployees();
              refetchDepts();
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
          onClick={() => setActiveSubTab("directory")}
          className={`pb-3 transition-colors ${activeSubTab === "directory" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>Staff Directory</span>
          </div>
        </button>
        <button
          onClick={() => setActiveSubTab("departments")}
          className={`pb-3 transition-colors ${activeSubTab === "departments" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          <div className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" />
            <span>Departments Catalog</span>
          </div>
        </button>
        <button
          onClick={() => setActiveSubTab("rbac")}
          className={`pb-3 transition-colors ${activeSubTab === "rbac" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          <div className="flex items-center gap-1.5">
            <Sliders className="h-4 w-4" />
            <span>RBAC Roles</span>
          </div>
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      <div className="flex-1 overflow-y-auto max-h-[65vh] pr-1">
        {activeSubTab === "directory" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {employees.map(emp => (
              <div key={emp.id} className="glass-card p-4 rounded-xl border border-white/5 flex flex-col justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400 font-extrabold text-sm border border-brand-500/25">
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-200 truncate">{emp.firstName} {emp.lastName}</h4>
                      <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded font-mono text-slate-400">{emp.employeeId}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{emp.designation} • {emp.department}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{emp.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      emp.employmentStatus === "suspended" ? "bg-rose-500/15 text-rose-400 border border-rose-500/20" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    }`}>
                      {emp.employmentStatus || "active"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-slate-400">
                  <div className="flex gap-4">
                    <span>Mode: <strong className="text-slate-200 capitalize">{emp.workMode || "office"}</strong></span>
                    <span>Role: <strong className="text-indigo-400">{emp.assignedRole || "Employee"}</strong></span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusToggle(emp)}
                      className="px-2.5 py-1 hover:bg-white/5 rounded border border-white/5 text-[10px] text-slate-300 font-bold"
                    >
                      {emp.employmentStatus === "suspended" ? "Activate" : "Suspend"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {employees.length === 0 && <p className="text-xs text-slate-500 text-center py-8 col-span-2">No employees registered.</p>}
          </div>
        )}

        {activeSubTab === "departments" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map(dept => (
              <div key={dept.id} className="glass-card p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-200">{dept.name}</h4>
                  <span className="text-[10px] bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold">
                    Active
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-xs text-slate-400 mt-2 font-semibold">
                  <span>Head: <strong className="text-slate-300">{dept.departmentHead || "Unassigned"}</strong></span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {dept.assignedModules?.map((mod, i) => (
                      <span key={i} className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded font-mono text-slate-400">{mod}</span>
                    ))}
                  </span>
                </div>
              </div>
            ))}
            {departments.length === 0 && (
              <div className="text-center py-8 col-span-3 text-xs text-slate-500">
                Loading default departments...
              </div>
            )}
          </div>
        )}

        {activeSubTab === "rbac" && (
          <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
              <span>RBAC Hierarchy & Access Rights</span>
            </h3>
            <p className="text-xs text-slate-400">FlowOS enforces strict role mapping, locking views and endpoints dynamically. You can quick-assign employee roles below.</p>

            <div className="flex flex-col gap-3 mt-2 text-xs">
              {employees.map(emp => (
                <div key={emp.id} className="flex items-center justify-between py-2 border-b border-white/5">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-300">{emp.firstName} {emp.lastName}</span>
                    <span className="text-[10px] text-slate-500">{emp.designation}</span>
                  </div>
                  <select
                    value={emp.assignedRole || "Employee"}
                    onChange={(e) => handleRoleChange(emp, e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Company Admin">Company Admin</option>
                    <option value="Department Manager">Department Manager</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Senior Employee">Senior Employee</option>
                    <option value="Employee">Employee</option>
                    <option value="Intern">Intern</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CREATE EMPLOYEE PROFILE MODAL */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-slate-200">Onboard New Employee Profile</h3>
              <button onClick={() => setIsEmpModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmp} className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Vikram"
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:border-brand-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Malhotra"
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vikram@flowos.io"
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:border-brand-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+9198765..."
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold">Designation</label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Senior Architect"
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:border-brand-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold">Department</label>
                  <select
                    value={department}
                    required
                    onChange={(e) => setDepartment(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-300 focus:border-brand-500 outline-none"
                  >
                    <option value="">Select Department</option>
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
                  <label className="text-slate-400 font-bold">Monthly Base Salary (₹)</label>
                  <input
                    type="number"
                    required
                    value={monthlyBaseSalary}
                    onChange={(e) => setMonthlyBaseSalary(e.target.value)}
                    placeholder="90000"
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:border-brand-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold">Work Mode</label>
                  <select
                    value={workMode}
                    onChange={(e) => setWorkMode(e.target.value as any)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-300 focus:border-brand-500 outline-none"
                  >
                    <option value="office">Office</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold">System Role Assignment</label>
                <select
                  value={assignedRole}
                  onChange={(e) => setAssignedRole(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-300 focus:border-brand-500 outline-none"
                >
                  <option value="Company Admin">Company Admin</option>
                  <option value="Department Manager">Department Manager</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Employee">Employee (Default)</option>
                  <option value="Intern">Intern</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={createEmpMutation.isPending}
                className="mt-2 w-full py-2.5 bg-brand-600 hover:bg-brand-500 rounded-lg text-white font-bold transition-colors"
              >
                {createEmpMutation.isPending ? "Creating Profile..." : "Confirm Employee Onboarding"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

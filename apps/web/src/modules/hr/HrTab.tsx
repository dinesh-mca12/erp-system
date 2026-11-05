import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  Users,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  X,
} from "lucide-react";
import { Employee, Payslip } from "@flowos/shared-types";

export default function HrTab() {
  const token = useAppSelector((state) => state.auth.token);
  const queryClient = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState<"directory" | "payroll">("directory");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  // Queries
  const { data: employees = [], refetch: refetchEmployees } = useQuery<Employee[]>({
    queryKey: ["employees", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/hr/employees", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: payslips = [], refetch: refetchPayslips } = useQuery<Payslip[]>({
    queryKey: ["payslips", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/hr/payslips", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  // Mutations
  const createEmployeeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/hr/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to add employee");
      return r.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setIsEmployeeModalOpen(false);
      showToast(`✓ Employee "${res.data.firstName} ${res.data.lastName}" registered.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  const createPayslipMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/hr/payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to run payroll");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payslips"] });
      setIsPayrollModalOpen(false);
      showToast(`✓ Payslip successfully generated & posted.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  // Form states
  const [empFirst, setEmpFirst] = useState("");
  const [empLast, setEmpLast] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empDesignation, setEmpDesignation] = useState("");
  const [empDept, setEmpDept] = useState("");
  const [empSalary, setEmpSalary] = useState("");
  const [empBank, setEmpBank] = useState("");

  const [payEmpId, setPayEmpId] = useState("");
  const [payMonth, setPayMonth] = useState("January");
  const [payYear, setPayYear] = useState(2026);
  const [payAllowances, setPayAllowances] = useState("");
  const [payDeductions, setPayDeductions] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empFirst || !empLast || !empEmail || !empDesignation) return;
    createEmployeeMutation.mutate({
      firstName: empFirst,
      lastName: empLast,
      email: empEmail,
      designation: empDesignation,
      department: empDept || "General",
      joiningDate: new Date().toISOString(),
      monthlyBaseSalary: Number(empSalary) || 20000,
      bankAccountNumber: empBank || "",
    });
  };

  const handleCreatePayslip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payEmpId) return;
    const base = employees.find(emp => emp.id === payEmpId)?.monthlyBaseSalary || 0;
    const allowances = Number(payAllowances) || 0;
    const deductions = Number(payDeductions) || 0;

    createPayslipMutation.mutate({
      employeeId: payEmpId,
      month: payMonth,
      year: Number(payYear),
      baseSalary: base,
      allowances,
      deductions,
      netSalary: base + allowances - deductions,
      status: "paid",
    });
  };

  const handlePrint = () => {
    window.print();
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
          <h2 className="text-2xl font-bold font-display tracking-wide text-slate-200">HR & Payroll</h2>
          <p className="text-xs text-slate-400 mt-1">Manage corporate staff details, process monthly payroll, and print employees payslips.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeSubTab === "directory" && (
            <button
              onClick={() => {
                setEmpFirst("");
                setEmpLast("");
                setEmpEmail("");
                setEmpDesignation("");
                setEmpDept("");
                setEmpSalary("");
                setEmpBank("");
                setIsEmployeeModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:translate-y-0.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10"
            >
              <Plus className="h-4 w-4" />
              <span>Add Employee</span>
            </button>
          )}
          {activeSubTab === "payroll" && (
            <button
              onClick={() => {
                setPayEmpId("");
                setPayMonth("January");
                setPayYear(2026);
                setPayAllowances("");
                setPayDeductions("");
                setIsPayrollModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:translate-y-0.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10"
            >
              <Plus className="h-4 w-4" />
              <span>Run Payroll</span>
            </button>
          )}
          <button
            onClick={() => {
              refetchEmployees();
              refetchPayslips();
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
          Employee Directory
        </button>
        <button
          onClick={() => setActiveSubTab("payroll")}
          className={`pb-3 transition-colors ${activeSubTab === "payroll" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Payroll & Payslips
        </button>
      </div>

      {/* VIEW GRID */}
      <div className="flex-1 overflow-y-auto max-h-[65vh] pr-1">
        {activeSubTab === "directory" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map(emp => (
              <div key={emp.id} className="glass-card p-5 rounded-2xl border border-white/5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-900 border border-white/10 rounded-full flex items-center justify-center text-slate-300">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">{emp.firstName} {emp.lastName}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{emp.designation} • {emp.department}</p>
                  </div>
                </div>
                <div className="border-t border-white/5 pt-3 flex justify-between text-xs text-slate-400">
                  <div>
                    <span>Base Salary</span>
                    <p className="text-slate-200 font-semibold mt-0.5">₹{(emp.monthlyBaseSalary || 0).toLocaleString()}/mo</p>
                  </div>
                  <div>
                    <span>Contact</span>
                    <p className="text-slate-200 font-semibold mt-0.5 truncate max-w-[120px]">{emp.email}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === "payroll" && (
          <div className="flex flex-col gap-3">
            {payslips.map(ps => {
              const emp = employees.find(e => e.id === ps.employeeId);
              return (
                <div key={ps.id} className="glass-card p-4 rounded-xl border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold font-display text-slate-200 text-sm">
                        {emp ? `${emp.firstName} ${emp.lastName}` : "Employee Profile"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Period: {ps.month} {ps.year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-display font-bold text-slate-200">
                      ₹{ps.netSalary.toLocaleString()}
                    </span>
                    <button
                      onClick={() => setSelectedPayslip(ps)}
                      className="px-3.5 py-2 bg-slate-900 border border-white/10 hover:bg-slate-800 text-indigo-400 rounded-xl text-xs font-bold font-display"
                    >
                      View Slip
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold font-display text-slate-200">Register Employee</h3>
              <button onClick={() => setIsEmployeeModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="flex flex-col gap-4 text-sm text-slate-300">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">First Name</label>
                  <input
                    type="text"
                    value={empFirst}
                    onChange={(e) => setEmpFirst(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Last Name</label>
                  <input
                    type="text"
                    value={empLast}
                    onChange={(e) => setEmpLast(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Work Email</label>
                <input
                  type="email"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Developer"
                    value={empDesignation}
                    onChange={(e) => setEmpDesignation(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Tech"
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Base Salary (₹)</label>
                  <input
                    type="number"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Bank Account</label>
                  <input
                    type="text"
                    placeholder="Optional bank no"
                    value={empBank}
                    onChange={(e) => setEmpBank(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createEmployeeMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors mt-2"
              >
                {createEmployeeMutation.isPending ? "Saving..." : "Save Employee"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RUN PAYROLL MODAL */}
      {isPayrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold font-display text-slate-200">Run Employee Payroll</h3>
              <button onClick={() => setIsPayrollModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreatePayslip} className="flex flex-col gap-4 text-sm text-slate-300">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Select Employee</label>
                <select
                  value={payEmpId}
                  onChange={(e) => setPayEmpId(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} (Base: ₹{emp.monthlyBaseSalary.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Month</label>
                  <select
                    value={payMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Year</label>
                  <input
                    type="number"
                    value={payYear}
                    onChange={(e) => setPayYear(Number(e.target.value))}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Allowances (₹)</label>
                  <input
                    type="number"
                    value={payAllowances}
                    onChange={(e) => setPayAllowances(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Deductions (₹)</label>
                  <input
                    type="number"
                    value={payDeductions}
                    onChange={(e) => setPayDeductions(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createPayslipMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors mt-2"
              >
                {createPayslipMutation.isPending ? "Processing..." : "Generate Payslip"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PAYSLIP MODAL (PRINT FORMAT) */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-xl p-6 rounded-2xl flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
            
            {/* Payslip Outer Sheet */}
            <div id="payslip-print-section" className="bg-slate-950 p-6 rounded-xl border border-white/10 flex flex-col gap-6 text-slate-200">
              
              {/* Slip Header */}
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded bg-brand-500 flex items-center justify-center text-white font-extrabold text-sm">F</div>
                  <div>
                    <h3 className="font-extrabold font-display text-sm tracking-wider">FlowOS Technologies</h3>
                    <p className="text-[10px] text-slate-500">Corporate Employee Pay Register</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 tracking-wider">PAYSLIP ADVICE</span>
                  <p className="text-xs text-brand-300 font-bold mt-0.5">{selectedPayslip.month} {selectedPayslip.year}</p>
                </div>
              </div>

              {/* Employee Advice Block */}
              {(() => {
                const emp = employees.find(e => e.id === selectedPayslip.employeeId);
                return (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Employee Details</span>
                      <p className="font-bold text-slate-300 mt-1">{emp ? `${emp.firstName} ${emp.lastName}` : "Staff Profile"}</p>
                      <p className="text-[11px] text-slate-400">{emp?.designation || "Designation"} ({emp?.department || "Department"})</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Deposit Account</span>
                      <p className="font-bold text-slate-300 mt-1">Bank Account Register</p>
                      <p className="text-[11px] text-slate-400 font-mono">No: {emp?.bankAccountNumber || "XXXXX"}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Payslip Earnings/Deductions Table */}
              <div className="grid grid-cols-2 gap-6 text-xs mt-2 border-t border-white/10 pt-4">
                {/* Earnings */}
                <div className="flex flex-col gap-2">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">Earnings</span>
                  <div className="flex justify-between pl-1">
                    <span>Basic Salary</span>
                    <span className="font-mono">₹{selectedPayslip.baseSalary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pl-1">
                    <span>Allowances</span>
                    <span className="font-mono">₹{selectedPayslip.allowances.toLocaleString()}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="flex flex-col gap-2 border-l border-white/10 pl-6">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">Deductions</span>
                  <div className="flex justify-between pl-1">
                    <span>Income Withholding</span>
                    <span className="font-mono">₹{selectedPayslip.deductions.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Net Salary Summary */}
              <div className="border-t border-white/10 pt-4 flex justify-between items-center text-sm font-bold bg-white/5 p-4 rounded-xl">
                <span className="text-slate-300 uppercase tracking-wide text-xs">Net Payout Value</span>
                <span className="font-display font-extrabold text-brand-300 text-lg">
                  ₹{selectedPayslip.netSalary.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold"
              >
                <Printer className="h-4 w-4" />
                <span>Print Advice Slip</span>
              </button>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

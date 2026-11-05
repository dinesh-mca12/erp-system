import { useState } from "react";
import { useDashboardData } from "./dashboardApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Check,
  X,
  Layers,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const { data, isLoading, isError, refetch } = useDashboardData();
  const [approvedSuggestions, setApprovedSuggestions] = useState<string[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const token = useAppSelector((state) => state.auth.token);
  const user = useAppSelector((state) => state.auth.user);
  const queryClient = useQueryClient();

  const { data: runwayReport = null } = useQuery<any>({
    queryKey: ["runwayReport", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/analytics/runway", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || null;
    },
    enabled: !!token,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/dashboard/suggestions/${id}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to approve suggestion.");
      }
      return response.json();
    },
    onSuccess: (_, id) => {
      setApprovedSuggestions((prev) => [...prev, id]);
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      showToast(`✓ Suggestion Approved: processed and generated draft transaction.`);
    },
    onError: (err: any) => {
      showToast(`✗ Error: ${err.message}`);
    }
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/dashboard/suggestions/${id}/dismiss`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to dismiss suggestion.");
      }
      return response.json();
    },
    onSuccess: (_, id) => {
      setDismissedSuggestions((prev) => [...prev, id]);
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      showToast(`✗ Suggestion dismissed and logged.`);
    },
    onError: (err: any) => {
      showToast(`✗ Error: ${err.message}`);
    }
  });

  const handleApprove = (id: string, _actionType: string) => {
    approveMutation.mutate(id);
  };

  const handleDismiss = (id: string) => {
    dismissMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-10 w-10 animate-spin text-brand-500" />
          <p className="font-display font-medium">FlowOS is loading your financial data...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-red-400">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 mb-3" />
          <h2 className="text-xl font-bold font-display">Data Load Error</h2>
          <p className="text-slate-400 mt-1">The data service is temporarily unavailable. Please retry in a moment.</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors"
          >
            Retry Sync
          </button>
        </div>
      </div>
    );
  }

  const { summary, suggestions, activities } = data;

  // Chart configurations
  const financialTrendData = {
    labels: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    datasets: [
      {
        fill: true,
        label: "Revenue",
        data: [640000, 780000, 810000, 920000, 1150000, 1420000],
        borderColor: "rgba(99, 102, 241, 1)",
        backgroundColor: "rgba(99, 102, 241, 0.05)",
        tension: 0.4,
      },
      {
        fill: true,
        label: "Expenses",
        data: [420000, 480000, 520000, 610000, 780000, 890000],
        borderColor: "rgba(236, 72, 153, 1)",
        backgroundColor: "rgba(236, 72, 153, 0.02)",
        tension: 0.4,
      },
    ],
  };

  const operationalTrendData = {
    labels: ["Composite Kit A", "Alloy Rollers", "Machined Joints", "Casing V2", "Wiring Loom"],
    datasets: [
      {
        label: "Units Sold",
        data: [420, 310, 240, 180, 120],
        backgroundColor: [
          "rgba(139, 92, 246, 0.7)",
          "rgba(99, 102, 241, 0.7)",
          "rgba(6, 182, 212, 0.7)",
          "rgba(16, 185, 129, 0.7)",
          "rgba(245, 158, 11, 0.7)",
        ],
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: "rgba(241, 245, 249, 0.7)" },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "rgba(241, 245, 249, 0.5)" } },
      y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "rgba(241, 245, 249, 0.5)" } },
    },
  };

  const isAdminOrManager = user?.role === "company_admin" || user?.role === "Super Admin" || user?.role === "Department Manager" || user?.role === "Team Lead";

  if (!isAdminOrManager) {
    return (
      <div className="min-h-screen bg-[#070b13] p-6 text-slate-100 flex flex-col gap-6">
        {/* HEADER BAR */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight font-display bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                FlowOS Employee Portal
              </h1>
              <span className="bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 font-display">
                <Sparkles className="h-3 w-3" /> Staff Active
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">Personal Work Desk & Attendance Console</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase font-semibold">User Role</p>
            <p className="text-sm text-slate-300 font-medium">{user?.role || "Employee"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* TODAY'S FOCUS (LEFT) */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* ANNOUNCEMENT */}
            <div className="glass-card p-5 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-slate-950/80 via-violet-950/10 to-slate-950/80 flex items-start gap-3">
              <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-violet-400 uppercase tracking-widest">Latest Announcement</h3>
                <p className="text-xs text-slate-200 mt-1.5 font-semibold">
                  📢 Welcome to the new corporate task assigner. Check your work list below and log progress values.
                </p>
              </div>
            </div>

            {/* MY TASKS */}
            <div className="glass-card p-5 rounded-2xl flex flex-col gap-4">
              <h3 className="font-bold text-lg font-display tracking-wide text-slate-200">My Assigned Tasks</h3>
              <div className="flex flex-col gap-3">
                <div className="p-4 rounded-xl border border-white/5 bg-slate-950/20 text-xs">
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-indigo-400">T-1001 • In Progress</span>
                    <span className="text-slate-500">Due: 2026-08-15</span>
                  </div>
                  <h4 className="font-bold text-slate-200 text-sm">Reconcile Q2 Banking ledger</h4>
                  <p className="text-slate-400 mt-1 font-sans">Verify matched transactions against the Cash Account and file reconciliation report.</p>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-slate-950/20 text-xs opacity-60">
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-emerald-400">T-1002 • Completed</span>
                    <span className="text-slate-500">Due: 2026-08-20</span>
                  </div>
                  <h4 className="font-bold text-slate-200 text-sm">Audit Warehouse stock levels</h4>
                  <p className="text-slate-400 mt-1 font-sans">Perform physical stock count at Mumbai Central and log stock adjustments.</p>
                </div>
              </div>
            </div>
          </div>

          {/* SIDEBAR WIDGETS (RIGHT) */}
          <div className="flex flex-col gap-6">
            {/* SHIFT & WORK MODE */}
            <div className="glass-card p-5 rounded-2xl flex flex-col gap-4">
              <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider">Attendance Console</h3>
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">Shift Time</span>
                  <span className="text-slate-200 font-bold">09:00 AM - 06:00 PM</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">Work Mode</span>
                  <span className="text-indigo-400 font-bold uppercase">Hybrid (Office/Remote)</span>
                </div>
                <button type="button" className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors">
                  Clock In
                </button>
              </div>
            </div>

            {/* ATTENDANCE SUMMARY */}
            <div className="glass-card p-5 rounded-2xl flex flex-col gap-3">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Leave Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-center mt-2">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-xl font-bold text-brand-400">14</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Leaves Remaining</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-xl font-bold text-violet-400">2</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Pending Approvals</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b13] p-6 text-slate-100 flex flex-col gap-6">
      
      {/* Toast Alert System */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 glass-card px-5 py-3 rounded-lg border-brand-500/30 shadow-lg shadow-brand-500/10 animate-bounce flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-400" />
          <span className="text-sm font-medium text-slate-200">{toastMessage}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight font-display bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              FlowOS
            </h1>
            <span className="bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 font-display">
              <Sparkles className="h-3 w-3" /> AI Core Active
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">Enterprise Resource Planning console</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase font-semibold">Active Company</p>
            <p className="text-sm text-slate-300 font-medium">Apex Labs India (comp_abc123)</p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg border border-white/5 transition-all"
            title="Refetch real-time summaries"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ZONE 1 — TODAY (Top strip, always visible) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Cash Position */}
        <div className="glass-card p-4 rounded-xl flex items-center justify-between group cursor-pointer transition-all hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cash Position</p>
            <p className="text-2xl font-bold font-display mt-1 text-emerald-400">
              ₹{(summary.cashPosition / 100000).toFixed(1)}L
            </p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-lg text-emerald-400 group-hover:scale-105 transition-transform">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Overdue Receivables */}
        <div className="glass-card p-4 rounded-xl flex items-center justify-between group cursor-pointer transition-all hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Receivables</p>
            <p className="text-2xl font-bold font-display mt-1 text-rose-400">
              ₹{(summary.overdueReceivables.amount / 1000).toFixed(0)}K
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{summary.overdueReceivables.count} Invoices Overdue</p>
          </div>
          <div className="bg-rose-500/10 p-3 rounded-lg text-rose-400 group-hover:scale-105 transition-transform">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Overdue Payables */}
        <div className="glass-card p-4 rounded-xl flex items-center justify-between group cursor-pointer transition-all hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payables</p>
            <p className="text-2xl font-bold font-display mt-1 text-amber-400">
              ₹{(summary.overduePayables.amount / 1000).toFixed(0)}K
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{summary.overduePayables.count} Bills Unpaid</p>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-lg text-amber-400 group-hover:scale-105 transition-transform">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {/* Approvals Pending */}
        <div className="glass-card p-4 rounded-xl flex items-center justify-between group cursor-pointer transition-all hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approvals</p>
            <p className="text-2xl font-bold font-display mt-1 text-violet-400">
              {summary.pendingApprovals}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Awaiting Your Action</p>
          </div>
          <div className="bg-violet-500/10 p-3 rounded-lg text-violet-400 group-hover:scale-105 transition-transform">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>

        {/* Low Stock count */}
        <div className="glass-card p-4 rounded-xl flex items-center justify-between group cursor-pointer transition-all hover:-translate-y-0.5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Low Stock SKUs</p>
            <p className="text-2xl font-bold font-display mt-1 text-cyan-400">
              {summary.lowStockCount}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Under Reorder Limits</p>
          </div>
          <div className="bg-cyan-500/10 p-3 rounded-lg text-cyan-400 group-hover:scale-105 transition-transform">
            <Layers className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* AI RUNWAY INTELLIGENCE BANNER */}
      {runwayReport && (
        <div className="glass-card p-5 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-slate-950/80 via-violet-950/10 to-slate-950/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-200">AI Cash Runway & Liquidity Projection</h3>
              <p className="text-xs text-slate-400 mt-1">
                Estimated Runway: <span className="font-bold text-violet-400 font-display">{runwayReport.runwayMonths} months</span> • Average Monthly Operating Burn: <span className="font-bold text-slate-300">₹{runwayReport.averageMonthlyBurn.toLocaleString()}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-[11px] text-slate-400">
            {runwayReport.alerts.map((alert: string, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5 text-violet-300 font-semibold">
                <span className="h-1 w-1 bg-violet-400 rounded-full shrink-0"></span>
                <span>{alert}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ZONE 2 — BUSINESS HEALTH (AI-Powered, Explainable) */}
      <div className="glass-card p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-center">
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="relative flex items-center justify-center h-28 w-28 rounded-full border-4 border-indigo-500/20">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-r-transparent animate-spin-slow"></div>
            <div className="text-center">
              <span className="text-3xl font-extrabold tracking-tight font-display">{summary.healthScore}</span>
              <span className="text-xs text-indigo-400 font-semibold block">Health Score</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3 w-full">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <span>AI Health Diagnostics — 3 Driving Factors</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summary.healthScoreFactors.map((factor, index) => (
              <div key={index} className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-200">{factor.factor}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      factor.impact === "positive"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {factor.impact.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{factor.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          <button
            onClick={() => showToast("Initiating Cashflow projection simulations...")}
            className="w-full md:w-auto px-5 py-3 bg-brand-600 hover:bg-brand-500 hover:shadow-lg hover:shadow-brand-500/20 active:translate-y-0.5 text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2"
          >
            <span>Analyze Cash Flow Runways</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ZONES 3 & 4 — TREND CHARTING GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ZONE 3 — FINANCIAL TREND (2/3 width) */}
        <div className="glass-card p-5 rounded-2xl md:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg font-display tracking-wide text-slate-200">Financial Trend</h3>
              <p className="text-xs text-slate-400">Revenue vs operating expenses (monthly accrual)</p>
            </div>
            <span className="text-xs text-brand-300 font-semibold bg-brand-500/10 px-2.5 py-1 rounded-full border border-brand-500/20">
              Live Ledger Synced
            </span>
          </div>
          <div className="h-64 relative">
            <Line data={financialTrendData} options={chartOptions} />
          </div>
        </div>

        {/* ZONE 4 — OPERATIONAL TREND (1/3 width) */}
        <div className="glass-card p-5 rounded-2xl flex flex-col gap-4">
          <div>
            <h3 className="font-bold text-lg font-display tracking-wide text-slate-200">Top Performing Products</h3>
            <p className="text-xs text-slate-400">Total units cleared by volume</p>
          </div>
          <div className="h-64 relative">
            <Bar data={operationalTrendData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* ZONES 5 & 6 — ACTION & ACTIVITIES QUEUES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ZONE 5 — AI SUGGESTIONS QUEUE */}
        <div className="glass-card p-5 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-5 w-5 text-violet-400" />
              <h3 className="font-bold text-lg font-display tracking-wide text-slate-200">
                AI Suggestions Queue
              </h3>
            </div>
            <span className="text-xs bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-violet-300 rounded font-bold uppercase tracking-wider">
              Drafts pending approval
            </span>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto max-h-[350px] pr-1">
            {suggestions
              .filter((sug) => !approvedSuggestions.includes(sug.id) && !dismissedSuggestions.includes(sug.id))
              .map((sug) => (
                <div key={sug.id} className="bg-slate-900/60 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-300 uppercase bg-brand-500/10 px-2 py-0.5 rounded">
                      {sug.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {(sug.confidenceScore * 100).toFixed(0)}% Confidence
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 leading-relaxed font-sans">
                    {sug.type === "draft_purchase_order" ? (
                      <div>
                        Draft PO for <span className="font-bold text-slate-200">{sug.proposedPayload.vendorName}</span>:
                        <ul className="list-disc pl-4 mt-1 text-slate-400">
                          {sug.proposedPayload.items.map((item: any, i: number) => (
                            <li key={i}>
                              {item.quantity} units of {item.productId} @ ₹{item.price} each
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div>
                        Send Payment Reminder to{" "}
                        <span className="font-bold text-slate-200">{sug.proposedPayload.customerName}</span> for{" "}
                        <span className="font-semibold text-rose-300">₹{sug.proposedPayload.amountOverdue}</span> (
                        {sug.proposedPayload.daysOverdue} days overdue)
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end mt-1">
                    <button
                      onClick={() => handleDismiss(sug.id)}
                      className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1"
                    >
                      <X className="h-3 w.5" /> Dismiss
                    </button>
                    <button
                      onClick={() => handleApprove(sug.id, sug.type)}
                      className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all text-xs flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" /> Approve & Commit
                    </button>
                  </div>
                </div>
              ))}
            {suggestions.filter((s) => !approvedSuggestions.includes(s.id) && !dismissedSuggestions.includes(s.id))
              .length === 0 && (
              <div className="text-center py-10 text-slate-500 text-sm">
                <CheckCircle className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                All AI suggestion actions reviewed.
              </div>
            )}
          </div>
        </div>

        {/* ZONE 6 — ACTIVITY & NOTIFICATIONS */}
        <div className="glass-card p-5 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Activity className="h-5 w-5 text-indigo-400" />
              <h3 className="font-bold text-lg font-display tracking-wide text-slate-200">
                Audit Trail & Log
              </h3>
            </div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Recent Modifications
            </span>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto max-h-[350px]">
            {activities.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0"
              >
                <div className="bg-indigo-500/10 p-1.5 rounded text-indigo-400 mt-0.5">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-200">{act.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{act.module}</span>
                    <span className="text-[10px] text-slate-500 font-medium">by {act.userName}</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                  {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

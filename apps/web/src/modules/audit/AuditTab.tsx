import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  RefreshCw,
  Search,
  User,
  Clock,
} from "lucide-react";

export default function AuditTab() {
  const token = useAppSelector((state) => state.auth.token);
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("");

  const { data: logs = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["activity_logs", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/dashboard/activities", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.description.toLowerCase().includes(search.toLowerCase()) || 
                          log.userName.toLowerCase().includes(search.toLowerCase());
    const matchesModule = filterModule ? log.module === filterModule : true;
    return matchesSearch && matchesModule;
  });

  return (
    <div className="p-6 flex flex-col gap-6 w-full">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-wide text-slate-200">System Audit Trails</h2>
          <p className="text-xs text-slate-400 mt-1">Review operational actions, tracking transaction edits, inventory write-offs, and administrative postings.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-all"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex gap-4 items-center bg-slate-950/20 px-4 py-3 rounded-xl border border-white/5">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search logs by description or admin user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none w-full"
          />
        </div>
        <select
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value)}
          className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
        >
          <option value="">All Modules</option>
          <option value="sales">Sales</option>
          <option value="purchase">Purchase</option>
          <option value="inventory">Inventory</option>
          <option value="accounting">Accounting</option>
          <option value="banking">Banking</option>
          <option value="hr">HR / Payroll</option>
          <option value="projects">Projects</option>
        </select>
      </div>

      {/* TIMELINE LIST */}
      <div className="flex-1 overflow-y-auto max-h-[60vh] pr-1 flex flex-col gap-4 relative pl-4 border-l border-white/5 ml-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="relative flex flex-col gap-1.5 pl-6 group">
              {/* Point indicator */}
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500/80 border-2 border-[#070b13] group-hover:scale-125 transition-transform"></span>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2 font-mono">
                  <User className="h-3 w-3 text-slate-400" />
                  <span className="text-slate-300">{log.userName}</span>
                  <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-indigo-400 uppercase">
                    {log.module}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="glass-card p-3 rounded-xl border border-white/5 text-xs text-slate-200 font-semibold max-w-2xl bg-slate-950/20">
                {log.description}
              </div>
            </div>
          ))
        )}

        {!isLoading && filteredLogs.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-8">No matching audit logs registered.</p>
        )}
      </div>
    </div>
  );
}

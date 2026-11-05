import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { Account, JournalEntry, FixedAsset } from "@flowos/shared-types";

export default function AccountingTab() {
  const token = useAppSelector((state) => state.auth.token);
  const queryClient = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState<"accounts" | "journals" | "assets" | "reports">("accounts");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [reportType, setReportType] = useState<"pl" | "bs">("pl");

  // Queries
  const { data: accounts = [], refetch: refetchAccounts } = useQuery<Account[]>({
    queryKey: ["accounts", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/accounting/accounts", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: journals = [], refetch: refetchJournals } = useQuery<JournalEntry[]>({
    queryKey: ["journals", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/accounting/journals", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: assets = [], refetch: refetchAssets } = useQuery<FixedAsset[]>({
    queryKey: ["assets", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/accounting/assets", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: plReport = null, refetch: refetchPL } = useQuery<{
    revenues: any[];
    expenses: any[];
    revenueTotal: number;
    expenseTotal: number;
    netIncome: number;
  } | null>({
    queryKey: ["plReport", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/accounting/reports/pl", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || null;
    },
    enabled: !!token && activeSubTab === "reports",
  });

  const { data: bsReport = null, refetch: refetchBS } = useQuery<{
    assets: any[];
    liabilities: any[];
    equities: any[];
    assetTotal: number;
    liabilityTotal: number;
    equityTotal: number;
    totalLiabilitiesAndEquity: number;
  } | null>({
    queryKey: ["bsReport", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/accounting/reports/balance-sheet", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || null;
    },
    enabled: !!token && activeSubTab === "reports",
  });

  // Mutations
  const createAccountMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/accounting/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to create account");
      return r.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["plReport"] });
      setIsAccountModalOpen(false);
      showToast(`✓ Account "${res.data.name}" created successfully.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  const createJournalMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/accounting/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to post entry");
      return r.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["plReport"] });
      setIsJournalModalOpen(false);
      showToast(`✓ Posted entry "${res.data.entryNumber}" successfully.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  const createAssetMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/accounting/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to create asset");
      return r.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setIsAssetModalOpen(false);
      showToast(`✓ Asset "${res.data.name}" registered successfully.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  const depreciateAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/v1/accounting/assets/${id}/depreciate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Failed to depreciate asset");
      return r.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      showToast(`✓ Depreciation applied: -₹${res.meta.amountDepreciated.toFixed(2)} book adjustment.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  // Form states
  const [accName, setAccName] = useState("");
  const [accCode, setAccCode] = useState("");
  const [accType, setAccType] = useState<Account["type"]>("asset");
  const [accBalance, setAccBalance] = useState("");

  const [jeNumber, setJeNumber] = useState("");
  const [jeDesc, setJeDesc] = useState("");
  const [jeLines, setJeLines] = useState<{ accountId: string; debit: number; credit: number }[]>([
    { accountId: "", debit: 0, credit: 0 },
    { accountId: "", debit: 0, credit: 0 },
  ]);

  const [assetName, setAssetName] = useState("");
  const [assetValue, setAssetValue] = useState("");
  const [assetLife, setAssetLife] = useState("");
  const [assetMethod, setAssetMethod] = useState<FixedAsset["depreciationMethod"]>("straight_line");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName || !accCode) return;
    createAccountMutation.mutate({
      name: accName,
      code: accCode,
      type: accType,
      balance: accBalance ? Number(accBalance) : 0,
    });
  };

  const handleJournalLineChange = (idx: number, field: string, val: any) => {
    const next = [...jeLines];
    next[idx] = { ...next[idx], [field]: val };
    setJeLines(next);
  };

  const calculateJeTotals = () => {
    let debits = 0;
    let credits = 0;
    jeLines.forEach(l => {
      debits += Number(l.debit) || 0;
      credits += Number(l.credit) || 0;
    });
    return { debits, credits };
  };

  const handleCreateJournal = (e: React.FormEvent) => {
    e.preventDefault();
    const { debits, credits } = calculateJeTotals();
    if (Math.abs(debits - credits) > 0.01) {
      showToast("✗ Entries do not balance: Debits must equal Credits.");
      return;
    }
    createJournalMutation.mutate({
      entryNumber: jeNumber,
      date: new Date().toISOString(),
      description: jeDesc,
      status: "posted",
      lines: jeLines.map(l => ({
        accountId: l.accountId,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      })),
    });
  };

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !assetValue || !assetLife) return;
    createAssetMutation.mutate({
      name: assetName,
      purchaseDate: new Date().toISOString(),
      purchaseValue: Number(assetValue),
      depreciationMethod: assetMethod,
      usefulLifeMonths: Number(assetLife),
      currentBookValue: Number(assetValue),
    });
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
          <h2 className="text-2xl font-bold font-display tracking-wide text-slate-200">Financials & General Ledger</h2>
          <p className="text-xs text-slate-400 mt-1">Review chart of accounts, post journal adjustments, run asset depreciations, and check P&L statements.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeSubTab === "accounts" && (
            <button
              onClick={() => {
                setAccName("");
                setAccCode("");
                setAccBalance("");
                setIsAccountModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:translate-y-0.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10"
            >
              <Plus className="h-4 w-4" />
              <span>Create Account</span>
            </button>
          )}
          {activeSubTab === "journals" && (
            <button
              onClick={() => {
                setJeNumber("JE-2026-" + Math.floor(1000 + Math.random() * 9000));
                setJeDesc("");
                setJeLines([{ accountId: "", debit: 0, credit: 0 }, { accountId: "", debit: 0, credit: 0 }]);
                setIsJournalModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:translate-y-0.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10"
            >
              <Plus className="h-4 w-4" />
              <span>Post Journal Entry</span>
            </button>
          )}
          {activeSubTab === "assets" && (
            <button
              onClick={() => {
                setAssetName("");
                setAssetValue("");
                setAssetLife("60");
                setIsAssetModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:translate-y-0.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10"
            >
              <Plus className="h-4 w-4" />
              <span>Register Fixed Asset</span>
            </button>
          )}
          <button
            onClick={() => {
              refetchAccounts();
              refetchJournals();
              refetchAssets();
              refetchPL();
              refetchBS();
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
          onClick={() => setActiveSubTab("accounts")}
          className={`pb-3 transition-colors ${activeSubTab === "accounts" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Chart of Accounts
        </button>
        <button
          onClick={() => setActiveSubTab("journals")}
          className={`pb-3 transition-colors ${activeSubTab === "journals" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Journal Entries
        </button>
        <button
          onClick={() => setActiveSubTab("assets")}
          className={`pb-3 transition-colors ${activeSubTab === "assets" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Fixed Assets & Depr.
        </button>
        <button
          onClick={() => setActiveSubTab("reports")}
          className={`pb-3 transition-colors ${activeSubTab === "reports" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Profit & Loss Statement
        </button>
      </div>

      {/* RENDER VIEW */}
      <div className="flex-1 overflow-y-auto max-h-[65vh] pr-1">
        {activeSubTab === "accounts" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(acc => (
              <div key={acc.id} className="glass-card p-4 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">[{acc.code}]</span>
                    <h4 className="font-bold text-slate-200 text-sm">{acc.name}</h4>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-400 block mt-1 w-max">
                    {acc.type}
                  </span>
                </div>
                <span className="font-display font-bold text-slate-200">
                  ₹{(acc.balance || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === "journals" && (
          <div className="flex flex-col gap-3">
            {journals.map(j => (
              <div key={j.id} className="glass-card p-4 rounded-xl border border-white/5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-white/5">
                  <span className="font-bold text-slate-200">{j.entryNumber}</span>
                  <span>{new Date(j.date).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-slate-300 font-semibold">{j.description}</p>
                <div className="flex flex-col gap-1 text-[11px] text-slate-400 font-mono">
                  {j.lines.map((l, idx) => {
                    const accName = accounts.find(a => a.id === l.accountId)?.name || "Unknown Account";
                    return (
                      <div key={idx} className="flex justify-between pl-2">
                        <span>{accName}</span>
                        <span>
                          {l.debit > 0 ? `Dr ₹${l.debit.toLocaleString()}` : `Cr ₹${l.credit.toLocaleString()}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {journals.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No journal entries logged.</p>}
          </div>
        )}

        {activeSubTab === "assets" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assets.map(fa => (
              <div key={fa.id} className="glass-card p-5 rounded-2xl border border-white/5 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-200 font-display text-base">{fa.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">Useful Life: {fa.usefulLifeMonths} months</p>
                  </div>
                  <button
                    onClick={() => depreciateAssetMutation.mutate(fa.id)}
                    className="px-3 py-1.5 bg-slate-900 border border-white/10 hover:bg-slate-800 rounded-lg text-[10px] font-bold text-indigo-400"
                  >
                    Run Depreciation
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-white/5 pt-3">
                  <div>
                    <span>Purchase Cost</span>
                    <p className="text-slate-200 font-bold font-display mt-0.5">₹{fa.purchaseValue.toLocaleString()}</p>
                  </div>
                  <div>
                    <span>Current Book Value</span>
                    <p className="text-slate-200 font-bold font-display mt-0.5">₹{fa.currentBookValue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
            {assets.length === 0 && <p className="text-xs text-slate-500 text-center py-8 col-span-2">No fixed assets registered.</p>}
          </div>
        )}

        {activeSubTab === "reports" && (
          <div className="flex flex-col gap-6 max-w-xl mx-auto">
            {/* Toggler */}
            <div className="flex bg-slate-950/40 p-1 rounded-xl border border-white/5 w-max mx-auto gap-1 text-xs">
              <button
                onClick={() => setReportType("pl")}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${reportType === "pl" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Profit & Loss
              </button>
              <button
                onClick={() => setReportType("bs")}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${reportType === "bs" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Balance Sheet
              </button>
            </div>

            {/* P&L Statement */}
            {reportType === "pl" && plReport && (
              <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-6 w-full">
                <div className="text-center pb-4 border-b border-white/5">
                  <h3 className="font-bold font-display text-lg text-slate-200">Income Statement (Profit & Loss)</h3>
                  <p className="text-[10px] text-slate-500 font-semibold tracking-widest mt-1 uppercase font-mono">Operating Year 2026</p>
                </div>

                <div className="flex flex-col gap-4 text-xs">
                  {/* REVENUE */}
                  <div>
                    <h4 className="font-bold text-slate-400 uppercase tracking-wider mb-2">1. Operating Revenue</h4>
                    <div className="flex flex-col gap-2 pl-3">
                      {plReport.revenues.map((r, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-slate-300">{r.name}</span>
                          <span className="font-mono text-slate-200">₹{r.balance.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-slate-200">
                        <span>Total Revenues</span>
                        <span className="font-mono">₹{plReport.revenueTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* EXPENSES */}
                  <div>
                    <h4 className="font-bold text-slate-400 uppercase tracking-wider mb-2">2. Operating Expenses</h4>
                    <div className="flex flex-col gap-2 pl-3">
                      {plReport.expenses.map((e, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-slate-300">{e.name}</span>
                          <span className="font-mono text-slate-200">₹{e.balance.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-slate-200">
                        <span>Total Operating Expenses</span>
                        <span className="font-mono">₹{plReport.expenseTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* NET INCOME */}
                  <div className="flex justify-between border-t border-brand-500/30 pt-3 font-display font-extrabold text-base text-brand-300">
                    <span>NET OPERATING INCOME</span>
                    <span>₹{plReport.netIncome.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Balance Sheet Statement */}
            {reportType === "bs" && bsReport && (
              <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-6 w-full">
                <div className="text-center pb-4 border-b border-white/5">
                  <h3 className="font-bold font-display text-lg text-slate-200">Statement of Financial Position</h3>
                  <p className="text-[10px] text-slate-500 font-semibold tracking-widest mt-1 uppercase font-mono">Balance Sheet • Year 2026</p>
                </div>

                <div className="flex flex-col gap-4 text-xs">
                  {/* ASSETS */}
                  <div>
                    <h4 className="font-bold text-slate-400 uppercase tracking-wider mb-2">1. Assets</h4>
                    <div className="flex flex-col gap-2 pl-3">
                      {bsReport.assets.map((a, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-slate-300">{a.name}</span>
                          <span className="font-mono text-slate-200">₹{a.balance.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-slate-200">
                        <span>Total Assets</span>
                        <span className="font-mono">₹{bsReport.assetTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* LIABILITIES */}
                  <div>
                    <h4 className="font-bold text-slate-400 uppercase tracking-wider mb-2">2. Liabilities</h4>
                    <div className="flex flex-col gap-2 pl-3">
                      {bsReport.liabilities.map((l, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-slate-300">{l.name}</span>
                          <span className="font-mono text-slate-200">₹{l.balance.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-slate-200">
                        <span>Total Liabilities</span>
                        <span className="font-mono">₹{bsReport.liabilityTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* EQUITY */}
                  <div>
                    <h4 className="font-bold text-slate-400 uppercase tracking-wider mb-2">3. Equity</h4>
                    <div className="flex flex-col gap-2 pl-3">
                      {bsReport.equities.map((eq, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-slate-300">{eq.name}</span>
                          <span className="font-mono text-slate-200">₹{eq.balance.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-slate-200">
                        <span>Total Equity</span>
                        <span className="font-mono">₹{bsReport.equityTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* TOTAL LIABILITIES & EQUITY */}
                  <div className="flex justify-between border-t border-brand-500/30 pt-3 font-display font-extrabold text-base text-slate-200">
                    <span>TOTAL LIABILITIES & EQUITY</span>
                    <span className="font-mono text-brand-300">₹{bsReport.totalLiabilitiesAndEquity.toLocaleString()}</span>
                  </div>

                  {/* BALANCE CHECK */}
                  {Math.abs(bsReport.assetTotal - bsReport.totalLiabilitiesAndEquity) < 0.1 && (
                    <div className="mt-2 text-center text-[10px] text-emerald-400 bg-emerald-500/10 py-1.5 rounded-lg font-bold border border-emerald-500/20 uppercase tracking-wider">
                      ✓ Balance Sheet Balanced (Assets = Liabilities + Equity)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE ACCOUNT MODAL */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold font-display text-slate-200">Create Ledger Account</h3>
              <button onClick={() => setIsAccountModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="flex flex-col gap-4 text-sm text-slate-300">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Account Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 1010"
                    value={accCode}
                    onChange={(e) => setAccCode(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Account Type</label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as any)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="revenue">Revenue</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sales Revenue"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Opening Balance (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={accBalance}
                  onChange={(e) => setAccBalance(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={createAccountMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors mt-2"
              >
                {createAccountMutation.isPending ? "Creating..." : "Save Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* POST JOURNAL ENTRY MODAL */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold font-display text-slate-200">Post Journal Entry</h3>
              <button onClick={() => setIsJournalModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateJournal} className="flex flex-col gap-4 text-sm text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Entry Number</label>
                  <input
                    type="text"
                    value={jeNumber}
                    onChange={(e) => setJeNumber(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Narration / Memo</label>
                  <input
                    type="text"
                    value={jeDesc}
                    onChange={(e) => setJeDesc(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    placeholder="Describe transaction"
                    required
                  />
                </div>
              </div>

              <div className="border-t border-white/5 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Debit/Credit Items</span>
                  <button
                    type="button"
                    onClick={() => setJeLines([...jeLines, { accountId: "", debit: 0, credit: 0 }])}
                    className="text-xs text-brand-400 hover:text-brand-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Line
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {jeLines.map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={line.accountId}
                        onChange={(e) => handleJournalLineChange(idx, "accountId", e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 text-xs w-44 focus:outline-none"
                        required
                      >
                        <option value="">Select Account</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Debit (₹)"
                        value={line.debit || ""}
                        onChange={(e) => handleJournalLineChange(idx, "debit", Number(e.target.value))}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 text-xs w-28"
                      />
                      <input
                        type="number"
                        placeholder="Credit (₹)"
                        value={line.credit || ""}
                        onChange={(e) => handleJournalLineChange(idx, "credit", Number(e.target.value))}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 text-xs w-28"
                      />
                      <button
                        type="button"
                        onClick={() => setJeLines(jeLines.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-rose-500/10 text-rose-400 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 flex justify-between text-xs font-bold text-slate-400">
                <div>
                  Debits: <span className="text-slate-200">₹{calculateJeTotals().debits.toLocaleString()}</span>
                </div>
                <div>
                  Credits: <span className="text-slate-200">₹{calculateJeTotals().credits.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={createJournalMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors mt-2"
              >
                {createJournalMutation.isPending ? "Posting..." : "Post balanced journal"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER FIXED ASSET MODAL */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold font-display text-slate-200">Register Fixed Asset</h3>
              <button onClick={() => setIsAssetModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="flex flex-col gap-4 text-sm text-slate-300">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Asset Name / Description</label>
                <input
                  type="text"
                  placeholder="e.g. MacBook Pro Engineering Lab"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    value={assetValue}
                    onChange={(e) => setAssetValue(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Useful Life (Months)</label>
                  <input
                    type="number"
                    value={assetLife}
                    onChange={(e) => setAssetLife(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Depreciation Method</label>
                <select
                  value={assetMethod}
                  onChange={(e) => setAssetMethod(e.target.value as any)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                >
                  <option value="straight_line">Straight Line Method (SLM)</option>
                  <option value="written_down_value">Written Down Value Method (WDV)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={createAssetMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors mt-2"
              >
                {createAssetMutation.isPending ? "Registering..." : "Save Fixed Asset"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

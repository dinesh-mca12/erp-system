import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  Landmark,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { BankAccount, BankTransaction, Invoice } from "@flowos/shared-types";

export default function BankingTab() {
  const token = useAppSelector((state) => state.auth.token);
  const queryClient = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState<"accounts" | "statement" | "reconcile">("accounts");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<BankTransaction | null>(null);
  const [matchedId, setMatchedId] = useState("");

  // Queries
  const { data: bankAccounts = [], refetch: refetchAccounts } = useQuery<BankAccount[]>({
    queryKey: ["bank_accounts", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/banking/accounts", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: bankTxs = [], refetch: refetchTxs } = useQuery<BankTransaction[]>({
    queryKey: ["bank_transactions", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/banking/transactions", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["invoices", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/sales/invoices", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token && activeSubTab === "reconcile",
  });

  // Mutations
  const createAccountMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/banking/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to add bank account");
      return r.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["bank_accounts"] });
      setIsAccountModalOpen(false);
      showToast(`✓ Vault Account "${res.data.accountName}" registered.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  const createTxMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/banking/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to log transaction");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank_accounts"] });
      setIsTxModalOpen(false);
      showToast(`✓ Statement transaction logged and vault adjusted.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  const reconcileMutation = useMutation({
    mutationFn: async ({ txId, matchId }: { txId: string; matchId: string }) => {
      const r = await fetch(`/api/v1/banking/transactions/${txId}/reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchedTransactionId: matchId }),
      });
      if (!r.ok) throw new Error("Failed to reconcile statement");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      setIsReconcileModalOpen(false);
      setSelectedTx(null);
      showToast(`✓ Transaction successfully matched and marked reconciled.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  // Form states
  const [accName, setAccName] = useState("");
  const [accNumber, setAccNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accBal, setAccBal] = useState("");

  const [txAccountId, setTxAccountId] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<"deposit" | "withdrawal">("deposit");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName || !accNumber || !bankName) return;
    createAccountMutation.mutate({
      accountName: accName,
      accountNumber: accNumber,
      bankName,
      balance: accBal ? Number(accBal) : 0,
      currencyCode: "INR",
    });
  };

  const handleCreateTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAccountId || !txDesc || !txAmount) return;
    createTxMutation.mutate({
      bankAccountId: txAccountId,
      date: new Date().toISOString(),
      description: txDesc,
      amount: Number(txAmount),
      type: txType,
      reconciled: false,
    });
  };

  const handleMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx || !matchedId) return;
    reconcileMutation.mutate({ txId: selectedTx.id, matchId: matchedId });
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
          <h2 className="text-2xl font-bold font-display tracking-wide text-slate-200">Banking & Vaults</h2>
          <p className="text-xs text-slate-400 mt-1">Register bank accounts, reconcile ledger journals with bank statements, and track capital balances.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeSubTab === "accounts" && (
            <button
              onClick={() => {
                setAccName("");
                setAccNumber("");
                setBankName("");
                setAccBal("");
                setIsAccountModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:translate-y-0.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10"
            >
              <Plus className="h-4 w-4" />
              <span>Link Bank Account</span>
            </button>
          )}
          {activeSubTab === "statement" && (
            <button
              onClick={() => {
                setTxAccountId("");
                setTxDesc("");
                setTxAmount("");
                setIsTxModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:translate-y-0.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10"
            >
              <Plus className="h-4 w-4" />
              <span>Log Statement Tx</span>
            </button>
          )}
          <button
            onClick={() => {
              refetchAccounts();
              refetchTxs();
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
          Bank Accounts
        </button>
        <button
          onClick={() => setActiveSubTab("statement")}
          className={`pb-3 transition-colors ${activeSubTab === "statement" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Statement Register
        </button>
        <button
          onClick={() => setActiveSubTab("reconcile")}
          className={`pb-3 transition-colors ${activeSubTab === "reconcile" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Ledger Reconciliation
        </button>
      </div>

      {/* VIEW GRID */}
      <div className="flex-1 overflow-y-auto max-h-[65vh] pr-1">
        {activeSubTab === "accounts" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map(b => (
              <div key={b.id} className="glass-card p-5 rounded-2xl border border-white/5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl">
                    <Landmark className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">{b.accountName}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{b.bankName} • {b.accountNumber}</p>
                  </div>
                </div>
                <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Available Vault Balance</span>
                  <span className="font-display font-extrabold text-slate-100 text-base">₹{b.balance.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === "statement" && (
          <div className="flex flex-col gap-3">
            {bankTxs.map(tx => {
              const acc = bankAccounts.find(a => a.id === tx.bankAccountId);
              return (
                <div key={tx.id} className="glass-card p-4 rounded-xl border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg text-xs font-bold ${tx.type === "deposit" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                      {tx.type === "deposit" ? "+ IN" : "- OUT"}
                    </div>
                    <div>
                      <p className="font-bold font-display text-slate-200 text-sm">{tx.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Vault: {acc ? acc.accountName : "Checking"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-display font-bold text-slate-200">
                      ₹{tx.amount.toLocaleString()}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tx.reconciled ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                      {tx.reconciled ? "RECONCILED" : "UNMATCHED"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeSubTab === "reconcile" && (
          <div className="flex flex-col gap-3">
            {bankTxs.filter(t => !t.reconciled).map(tx => {
              const acc = bankAccounts.find(a => a.id === tx.bankAccountId);
              return (
                <div key={tx.id} className="glass-card p-4 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tx.type === "deposit" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                        {tx.type === "deposit" ? "DEPOSIT" : "WITHDRAWAL"}
                      </span>
                      <h4 className="font-bold text-slate-200 text-sm">{tx.description}</h4>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Bank Account: {acc ? acc.accountName : "Primary"} • Date: {new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-display font-bold text-slate-200">₹{tx.amount.toLocaleString()}</span>
                    <button
                      onClick={() => {
                        setSelectedTx(tx);
                        setMatchedId("");
                        setIsReconcileModalOpen(true);
                      }}
                      className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold font-display"
                    >
                      Reconcile Match
                    </button>
                  </div>
                </div>
              );
            })}
            {bankTxs.filter(t => !t.reconciled).length === 0 && (
              <p className="text-xs text-slate-500 text-center py-8">✓ All statement lines reconciliated.</p>
            )}
          </div>
        )}
      </div>

      {/* LINK BANK MODAL */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold font-display text-slate-200">Link Bank Account</h3>
              <button onClick={() => setIsAccountModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="flex flex-col gap-4 text-sm text-slate-300">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Account Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. Primary Checking"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 501004..."
                  value={accNumber}
                  onChange={(e) => setAccNumber(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Starting Bank Balance (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={accBal}
                  onChange={(e) => setAccBal(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={createAccountMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors mt-2"
              >
                {createAccountMutation.isPending ? "Linking..." : "Link Vault Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LOG STATEMENT TX MODAL */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold font-display text-slate-200">Log Bank Transaction</h3>
              <button onClick={() => setIsTxModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateTx} className="flex flex-col gap-4 text-sm text-slate-300">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Select Bank Account</label>
                <select
                  value={txAccountId}
                  onChange={(e) => setTxAccountId(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                >
                  <option value="">Select Account</option>
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.accountName} (₹{a.balance.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Tx Type</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="deposit">Deposit / Inbound</option>
                    <option value="withdrawal">Withdrawal / Outbound</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Amount (₹)</label>
                  <input
                    type="number"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Description / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Labs settlement receipt"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={createTxMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors mt-2"
              >
                {createTxMutation.isPending ? "Logging..." : "Log Statement transaction"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RECONCILE MATCHING MODAL */}
      {isReconcileModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold font-display text-slate-200">Reconcile Match</h3>
              <button onClick={() => setIsReconcileModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="text-xs text-slate-400 bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="font-bold text-slate-300">Bank Statement Entry:</span>
              <p className="mt-1 text-slate-200 font-semibold">{selectedTx.description}</p>
              <p className="mt-0.5 text-brand-300 font-bold font-display">Amount: ₹{selectedTx.amount.toLocaleString()}</p>
            </div>

            <form onSubmit={handleMatch} className="flex flex-col gap-4 text-sm text-slate-300">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Select Matching Sales Invoice</label>
                <select
                  value={matchedId}
                  onChange={(e) => setMatchedId(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                >
                  <option value="">Select Invoice</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} (₹{inv.grandTotal.toLocaleString()} • Due: {new Date(inv.dueDate).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={reconcileMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors mt-2"
              >
                {reconcileMutation.isPending ? "Matching..." : "Match & Close Ledger"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

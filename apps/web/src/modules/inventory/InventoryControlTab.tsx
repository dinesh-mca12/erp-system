import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  Package,
  Plus,
  RefreshCw,
  X,
  Shuffle,
  Wrench,
} from "lucide-react";
import { Warehouse, Product } from "@flowos/shared-types";

export default function InventoryControlTab() {
  const token = useAppSelector((state) => state.auth.token);
  const queryClient = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState<"warehouses" | "adjustments" | "transfers">("warehouses");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);

  // Queries
  const { data: warehouses = [], refetch: refetchWarehouses } = useQuery<Warehouse[]>({
    queryKey: ["warehouses", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/inventory/warehouses", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/products", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  // Mutations
  const createWarehouseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/inventory/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to create warehouse");
      return r.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      setIsWarehouseModalOpen(false);
      showToast(`✓ Warehouse "${res.data.name}" added successfully.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  const adjustStockMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Failed to adjust stock levels");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      showToast("✓ Manual stock level adjustment processed.");
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  const transferStockMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Failed to transfer stock");
      return r.json();
    },
    onSuccess: () => {
      showToast("✓ Warehouse stock transfer logged.");
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  // Form states
  const [whName, setWhName] = useState("");
  const [whLocation, setWhLocation] = useState("");
  const [whCode, setWhCode] = useState("");

  const [adjProdId, setAdjProdId] = useState("");
  const [adjWhId, setAdjWhId] = useState("");
  const [adjType, setAdjType] = useState<"increment" | "decrement">("increment");
  const [adjQty, setAdjQty] = useState("");
  const [adjReason, setAdjReason] = useState("");

  const [transProdId, setTransProdId] = useState("");
  const [transSrcWh, setTransSrcWh] = useState("");
  const [transTgtWh, setTransTgtWh] = useState("");
  const [transQty, setTransQty] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName || !whLocation || !whCode) return;
    createWarehouseMutation.mutate({
      name: whName,
      location: whLocation,
      code: whCode,
    });
  };

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProdId || !adjWhId || !adjQty || !adjReason) return;
    adjustStockMutation.mutate({
      warehouseId: adjWhId,
      productId: adjProdId,
      type: adjType,
      quantity: Number(adjQty),
      reason: adjReason,
    });
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transProdId || !transSrcWh || !transTgtWh || !transQty) return;
    if (transSrcWh === transTgtWh) {
      showToast("✗ Source and destination warehouses must be different.");
      return;
    }
    transferStockMutation.mutate({
      sourceWarehouseId: transSrcWh,
      targetWarehouseId: transTgtWh,
      productId: transProdId,
      quantity: Number(transQty),
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
          <h2 className="text-2xl font-bold font-display tracking-wide text-slate-200">Warehouses & Relocations</h2>
          <p className="text-xs text-slate-400 mt-1">Manage multiple warehouses, run manual adjustments for inventory Audits, and log internal stock transfers.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeSubTab === "warehouses" && (
            <button
              onClick={() => {
                setWhName("");
                setWhLocation("");
                setWhCode("");
                setIsWarehouseModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:translate-y-0.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10"
            >
              <Plus className="h-4 w-4" />
              <span>Link Warehouse</span>
            </button>
          )}
          {activeSubTab === "adjustments" && (
            <button
              onClick={() => {
                setAdjProdId("");
                setAdjWhId("");
                setAdjQty("");
                setAdjReason("");
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:translate-y-0.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10"
            >
              <Wrench className="h-4 w-4" />
              <span>Manual Adjustment</span>
            </button>
          )}
          {activeSubTab === "transfers" && (
            <button
              onClick={() => {
                setTransProdId("");
                setTransSrcWh("");
                setTransTgtWh("");
                setTransQty("");
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:translate-y-0.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10"
            >
              <Shuffle className="h-4 w-4" />
              <span>Transfer Stock</span>
            </button>
          )}
          <button
            onClick={() => {
              refetchWarehouses();
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
          onClick={() => setActiveSubTab("warehouses")}
          className={`pb-3 transition-colors ${activeSubTab === "warehouses" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Warehouse List
        </button>
        <button
          onClick={() => setActiveSubTab("adjustments")}
          className={`pb-3 transition-colors ${activeSubTab === "adjustments" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Audit Adjustments
        </button>
        <button
          onClick={() => setActiveSubTab("transfers")}
          className={`pb-3 transition-colors ${activeSubTab === "transfers" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Internal Relocations
        </button>
      </div>

      {/* RENDERS */}
      <div className="flex-1 overflow-y-auto max-h-[65vh] pr-1">
        {activeSubTab === "warehouses" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map(w => (
              <div key={w.id} className="glass-card p-5 rounded-2xl border border-white/5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">{w.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Location: {w.location}</p>
                  </div>
                </div>
                <div className="border-t border-white/5 pt-3 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <span>Warehouse Code</span>
                  <span className="text-slate-200 font-mono font-semibold">{w.code}</span>
                </div>
              </div>
            ))}
            {warehouses.length === 0 && <p className="text-xs text-slate-500 text-center py-8 col-span-3">No warehouses registered.</p>}
          </div>
        )}

        {activeSubTab === "adjustments" && (
          <div className="max-w-md mx-auto glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
            <h3 className="font-bold font-display text-sm text-slate-200">Initiate Physical Inventory Adjust</h3>
            <p className="text-xs text-slate-400">Post adjustments to align system quantities with real physical warehouse counts.</p>

            <form onSubmit={handleAdjust} className="flex flex-col gap-4 text-xs text-slate-300">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Product</label>
                <select
                  value={adjProdId}
                  onChange={(e) => setAdjProdId(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                >
                  <option value="">Select Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Current Stock: {p.openingStock})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Warehouse Location</label>
                  <select
                    value={adjWhId}
                    onChange={(e) => setAdjWhId(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  >
                    <option value="">Select WH</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Adjustment Type</label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as any)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="increment">Add Stock (+)</option>
                    <option value="decrement">Write-off Stock (-)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Quantity Adjusted</label>
                  <input
                    type="number"
                    value={adjQty}
                    onChange={(e) => setAdjQty(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Audit Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Broken packaging write-off"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={adjustStockMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors mt-2"
              >
                {adjustStockMutation.isPending ? "Posting..." : "Post Adjustment"}
              </button>
            </form>
          </div>
        )}

        {activeSubTab === "transfers" && (
          <div className="max-w-md mx-auto glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
            <h3 className="font-bold font-display text-sm text-slate-200">Log Warehouse Stock Relocation</h3>
            <p className="text-xs text-slate-400">Move product inventories from one warehouse depot to another. This will not change company-wide product counts.</p>

            <form onSubmit={handleTransfer} className="flex flex-col gap-4 text-xs text-slate-300">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Select Product</label>
                <select
                  value={transProdId}
                  onChange={(e) => setTransProdId(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                >
                  <option value="">Select Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Source Warehouse</label>
                  <select
                    value={transSrcWh}
                    onChange={(e) => setTransSrcWh(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  >
                    <option value="">Select Source WH</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Destination Warehouse</label>
                  <select
                    value={transTgtWh}
                    onChange={(e) => setTransTgtWh(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  >
                    <option value="">Select Target WH</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Transfer Quantity</label>
                <input
                  type="number"
                  value={transQty}
                  onChange={(e) => setTransQty(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={transferStockMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors mt-2"
              >
                {transferStockMutation.isPending ? "Logging transfer..." : "Dispatch Transfer"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* LINK WAREHOUSE MODAL */}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold font-display text-slate-200">Link Corporate Warehouse</h3>
              <button onClick={() => setIsWarehouseModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="flex flex-col gap-4 text-sm text-slate-300">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Warehouse Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. Chennai Logistics Hub"
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Location City / State</label>
                  <input
                    type="text"
                    placeholder="e.g. Chennai, Tamil Nadu"
                    value={whLocation}
                    onChange={(e) => setWhLocation(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Warehouse Code</label>
                  <input
                    type="text"
                    placeholder="e.g. WH-MAA-03"
                    value={whCode}
                    onChange={(e) => setWhCode(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createWarehouseMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors mt-2"
              >
                {createWarehouseMutation.isPending ? "Creating..." : "Save Warehouse"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

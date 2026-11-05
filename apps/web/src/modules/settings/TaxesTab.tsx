import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  RefreshCw,
  Plus,
  Layers,
  MapPin,
  Tag,
  Boxes,
} from "lucide-react";
import { Category, Brand, Unit, Warehouse, TaxSetting } from "@flowos/shared-types";

export default function TaxesTab() {
  const token = useAppSelector((state) => state.auth.token);
  const queryClient = useQueryClient();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // States to toggle editors
  const [activeSubTab, setActiveSubTab] = useState<"warehouses" | "taxes" | "categories" | "units" | "brands">("warehouses");

  // Form input states
  const [whName, setWhName] = useState("");
  const [whCode, setWhCode] = useState("");
  const [whLoc, setWhLoc] = useState("");

  const [txName, setTxName] = useState("");
  const [txRate, setTxRate] = useState<number>(18);
  const [txType, setTxType] = useState<"cgst" | "sgst" | "igst" | "flat" | "group">("cgst");

  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  const [brName, setBrName] = useState("");

  const [unName, setUnName] = useState("");
  const [unAbbr, setUnAbbr] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Queries
  const { data: warehouses = [], refetch: refetchWh } = useQuery<Warehouse[]>({
    queryKey: ["warehouses", token],
    queryFn: async () => {
      const r = await fetch("/api/v1/products/warehouses", { headers: { Authorization: `Bearer ${token}` } });
      return (await r.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: taxes = [], refetch: refetchTx } = useQuery<TaxSetting[]>({
    queryKey: ["taxes", token],
    queryFn: async () => {
      const r = await fetch("/api/v1/products/taxes", { headers: { Authorization: `Bearer ${token}` } });
      return (await r.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: categories = [], refetch: refetchCat } = useQuery<Category[]>({
    queryKey: ["categories_settings", token],
    queryFn: async () => {
      const r = await fetch("/api/v1/products/categories", { headers: { Authorization: `Bearer ${token}` } });
      return (await r.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: units = [], refetch: refetchUn } = useQuery<Unit[]>({
    queryKey: ["units_settings", token],
    queryFn: async () => {
      const r = await fetch("/api/v1/products/units", { headers: { Authorization: `Bearer ${token}` } });
      return (await r.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: brands = [], refetch: refetchBr } = useQuery<Brand[]>({
    queryKey: ["brands_settings", token],
    queryFn: async () => {
      const r = await fetch("/api/v1/products/brands", { headers: { Authorization: `Bearer ${token}` } });
      return (await r.json()).data || [];
    },
    enabled: !!token,
  });

  // Mutations Helper
  const createMutation = (url: string, queryKey: string[], onSuccessMsg: string, resetFn: () => void) => {
    return useMutation({
      mutationFn: async (payload: any) => {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to save setting.");
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
        showToast(onSuccessMsg);
        resetFn();
      },
      onError: (err: any) => {
        showToast(`✗ Error: ${err.message}`);
      },
    });
  };

  const addWarehouse = createMutation("/api/v1/products/warehouses", ["warehouses"], "✓ Warehouse created.", () => { setWhName(""); setWhCode(""); setWhLoc(""); });
  const addTax = createMutation("/api/v1/products/taxes", ["taxes"], "✓ Tax setting created.", () => { setTxName(""); setTxRate(18); });
  const addCategory = createMutation("/api/v1/products/categories", ["categories_settings", "categories"], "✓ Product Category created.", () => { setCatName(""); setCatDesc(""); });
  const addBrand = createMutation("/api/v1/products/brands", ["brands_settings", "brands"], "✓ Brand created.", () => { setBrName(""); });
  const addUnit = createMutation("/api/v1/products/units", ["units_settings", "units"], "✓ Unit created.", () => { setUnName(""); setUnAbbr(""); });

  return (
    <div className="p-6 flex flex-col gap-6 w-full">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 glass-card px-5 py-3 rounded-lg border-brand-500/30 shadow-lg shadow-brand-500/10 flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">{toastMessage}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-wide text-slate-200">Master Lookups Console</h2>
          <p className="text-xs text-slate-400 mt-1">Configure systemic variables, storage facilities, and compliance metrics.</p>
        </div>
      </div>

      {/* SUB TABS BUTTONS */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-1">
        <button
          onClick={() => setActiveSubTab("warehouses")}
          className={`px-4 py-2 border-b-2 text-xs font-semibold font-display tracking-wide transition-all ${
            activeSubTab === "warehouses" ? "border-brand-500 text-brand-300" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Warehouses
        </button>
        <button
          onClick={() => setActiveSubTab("taxes")}
          className={`px-4 py-2 border-b-2 text-xs font-semibold font-display tracking-wide transition-all ${
            activeSubTab === "taxes" ? "border-brand-500 text-brand-300" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Tax Settings
        </button>
        <button
          onClick={() => setActiveSubTab("categories")}
          className={`px-4 py-2 border-b-2 text-xs font-semibold font-display tracking-wide transition-all ${
            activeSubTab === "categories" ? "border-brand-500 text-brand-300" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveSubTab("units")}
          className={`px-4 py-2 border-b-2 text-xs font-semibold font-display tracking-wide transition-all ${
            activeSubTab === "units" ? "border-brand-500 text-brand-300" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Units
        </button>
        <button
          onClick={() => setActiveSubTab("brands")}
          className={`px-4 py-2 border-b-2 text-xs font-semibold font-display tracking-wide transition-all ${
            activeSubTab === "brands" ? "border-brand-500 text-brand-300" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Brands
        </button>
      </div>

      {/* RENDER ACTIVE LOOKUP PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: CRATE FORM */}
        <div className="glass-card p-5 rounded-2xl border-white/5 flex flex-col gap-4">
          <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider font-display">
            Create Master Record
          </h3>

          {activeSubTab === "warehouses" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addWarehouse.mutate({ name: whName, code: whCode, location: whLoc, isDefault: false });
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="text"
                required
                placeholder="Warehouse Name"
                value={whName}
                onChange={(e) => setWhName(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
              <input
                type="text"
                required
                placeholder="Warehouse Code (e.g. WH-BOM)"
                value={whCode}
                onChange={(e) => setWhCode(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
              />
              <input
                type="text"
                placeholder="Location (city/region)"
                value={whLoc}
                onChange={(e) => setWhLoc(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
              <button
                type="submit"
                disabled={addWarehouse.isPending}
                className="mt-2 w-full py-2 bg-brand-600 hover:bg-brand-500 font-bold rounded-lg text-xs text-white transition-all flex items-center justify-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Save Warehouse
              </button>
            </form>
          )}

          {activeSubTab === "taxes" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addTax.mutate({ name: txName, rate: Number(txRate), type: txType });
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="text"
                required
                placeholder="Tax Name (e.g. CGST 9%)"
                value={txName}
                onChange={(e) => setTxName(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
              <input
                type="number"
                required
                min="0"
                step="0.1"
                placeholder="Rate (%)"
                value={txRate}
                onChange={(e) => setTxRate(Number(e.target.value))}
                className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 font-semibold"
              />
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value as any)}
                className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200"
              >
                <option value="cgst">CGST (Central)</option>
                <option value="sgst">SGST (State)</option>
                <option value="igst">IGST (Integrated)</option>
                <option value="flat">Flat Tax</option>
              </select>
              <button
                type="submit"
                disabled={addTax.isPending}
                className="mt-2 w-full py-2 bg-brand-600 hover:bg-brand-500 font-bold rounded-lg text-xs text-white transition-all flex items-center justify-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Save Tax Rate
              </button>
            </form>
          )}

          {activeSubTab === "categories" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addCategory.mutate({ name: catName, description: catDesc });
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="text"
                required
                placeholder="Category Name"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
              <input
                type="text"
                placeholder="Description"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
              <button
                type="submit"
                disabled={addCategory.isPending}
                className="mt-2 w-full py-2 bg-brand-600 hover:bg-brand-500 font-bold rounded-lg text-xs text-white transition-all flex items-center justify-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Save Category
              </button>
            </form>
          )}

          {activeSubTab === "units" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addUnit.mutate({ name: unName, abbreviation: unAbbr });
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="text"
                required
                placeholder="Unit Name (e.g. Kilograms)"
                value={unName}
                onChange={(e) => setUnName(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
              <input
                type="text"
                required
                placeholder="Abbreviation (e.g. kg)"
                value={unAbbr}
                onChange={(e) => setUnAbbr(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
              />
              <button
                type="submit"
                disabled={addUnit.isPending}
                className="mt-2 w-full py-2 bg-brand-600 hover:bg-brand-500 font-bold rounded-lg text-xs text-white transition-all flex items-center justify-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Save Unit UoM
              </button>
            </form>
          )}

          {activeSubTab === "brands" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addBrand.mutate({ name: brName });
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="text"
                required
                placeholder="Brand Tag Name"
                value={brName}
                onChange={(e) => setBrName(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
              <button
                type="submit"
                disabled={addBrand.isPending}
                className="mt-2 w-full py-2 bg-brand-600 hover:bg-brand-500 font-bold rounded-lg text-xs text-white transition-all flex items-center justify-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Save Brand Tag
              </button>
            </form>
          )}
        </div>

        {/* RIGHT COLUMN: DIRECTORY LIST (2/3 width) */}
        <div className="glass-card p-5 rounded-2xl border-white/5 lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider font-display">
              Registered Master Records
            </h3>
            <button
              onClick={() => {
                if (activeSubTab === "warehouses") refetchWh();
                if (activeSubTab === "taxes") refetchTx();
                if (activeSubTab === "categories") refetchCat();
                if (activeSubTab === "units") refetchUn();
                if (activeSubTab === "brands") refetchBr();
                showToast("✓ Reloaded lookup values.");
              }}
              className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto max-h-[450px]">
            {activeSubTab === "warehouses" && warehouses.map((wh) => (
              <div key={wh.id} className="bg-slate-900/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-200 text-xs font-display">{wh.name}</h4>
                  <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">Code: {wh.code} | {wh.location || "No address"}</span>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded text-emerald-400">
                  <MapPin className="h-4 w-4" />
                </div>
              </div>
            ))}

            {activeSubTab === "taxes" && taxes.map((tx) => (
              <div key={tx.id} className="bg-slate-900/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-200 text-xs font-display">{tx.name}</h4>
                  <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">Type: {tx.type}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
                    {tx.rate}%
                  </span>
                </div>
              </div>
            ))}

            {activeSubTab === "categories" && categories.map((cat) => (
              <div key={cat.id} className="bg-slate-900/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-200 text-xs font-display">{cat.name}</h4>
                  {cat.description && <span className="text-[10px] text-slate-500 mt-0.5 block leading-relaxed">{cat.description}</span>}
                </div>
                <div className="bg-indigo-500/10 p-2 rounded text-indigo-400">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
            ))}

            {activeSubTab === "units" && units.map((un) => (
              <div key={un.id} className="bg-slate-900/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-200 text-xs font-display">{un.name}</h4>
                  <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">Abbreviation: {un.abbreviation}</span>
                </div>
                <div className="bg-cyan-500/10 p-2 rounded text-cyan-400">
                  <Boxes className="h-4 w-4" />
                </div>
              </div>
            ))}

            {activeSubTab === "brands" && brands.map((br) => (
              <div key={br.id} className="bg-slate-900/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-200 text-xs font-display">{br.name}</h4>
                </div>
                <div className="bg-pink-500/10 p-2 rounded text-pink-400">
                  <Tag className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  Package,
  Search,
  Plus,
  RefreshCw,
  X,
  Check,
  Percent,
} from "lucide-react";
import { Product, Category, Brand, Unit } from "@flowos/shared-types";

export default function ProductsTab() {
  const token = useAppSelector((state) => state.auth.token);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [hsn, setHsn] = useState("");
  const [type, setType] = useState<Product["type"]>("product");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [openingStock, setOpeningStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(10);
  const [maxStock, setMaxStock] = useState<number>(100);
  const [valuationMethod, setValuationMethod] = useState<"fifo" | "weighted_average">("fifo");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch Products
  const { data: products = [], isLoading, isError, refetch } = useQuery<Product[]>({
    queryKey: ["products", token],
    queryFn: async () => {
      const response = await fetch("/api/v1/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load products.");
      const json = await response.json();
      return json.data;
    },
    enabled: !!token,
  });

  // 2. Fetch Lookups (Categories, Units, Brands) to populate form dropdowns
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories", token],
    queryFn: async () => {
      const response = await fetch("/api/v1/products/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return (await response.json()).data || [];
    },
    enabled: !!token && isModalOpen,
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["units", token],
    queryFn: async () => {
      const response = await fetch("/api/v1/products/units", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return (await response.json()).data || [];
    },
    enabled: !!token && isModalOpen,
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["brands", token],
    queryFn: async () => {
      const response = await fetch("/api/v1/products/brands", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return (await response.json()).data || [];
    },
    enabled: !!token && isModalOpen,
  });

  // 3. Add Product Mutation
  const addProductMutation = useMutation({
    mutationFn: async (newProduct: any) => {
      const response = await fetch("/api/v1/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProduct),
      });
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error?.message || "Failed to create product.");
      }
      return response.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsModalOpen(false);
      showToast(`✓ Product "${res.data.name}" added successfully.`);
      resetForm();
    },
    onError: (err: any) => {
      showToast(`✗ Error: ${err.message}`);
    },
  });

  const resetForm = () => {
    setSku("");
    setName("");
    setHsn("");
    setType("product");
    setCategoryId("");
    setBrandId("");
    setUnitId("");
    setSellingPrice(0);
    setPurchasePrice(0);
    setTaxRate(18);
    setOpeningStock(0);
    setMinStock(10);
    setMaxStock(100);
    setValuationMethod("fifo");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim() || !categoryId || !unitId) {
      showToast("✗ Please fill in all required fields.");
      return;
    }

    addProductMutation.mutate({
      sku,
      name,
      hsn,
      type,
      categoryId,
      brandId: brandId || undefined,
      unitId,
      sellingPrice: Number(sellingPrice),
      purchasePrice: Number(purchasePrice),
      taxRate: Number(taxRate),
      openingStock: Number(openingStock),
      minStock: Number(minStock),
      maxStock: Number(maxStock),
      valuationMethod,
      batchTracked: false,
      serialTracked: false,
      expiryTracked: false,
      images: [],
    });
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.hsn.toLowerCase().includes(search.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold font-display tracking-wide text-slate-200">Products & Inventory Catalog</h2>
          <p className="text-xs text-slate-400 mt-1">Manage physical products, digital services, and stock level warnings.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg border border-white/5 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl text-xs transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex items-center gap-4 bg-slate-950/20 p-4 rounded-xl border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or HSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>
      </div>

      {/* PRODUCTS TABLE */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : isError ? (
        <div className="text-center py-10 text-rose-400">
          <p>Failed to retrieve products. Verify Express server connection.</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-2xl border-white/5 flex flex-col items-center gap-4">
          <Package className="h-12 w-12 text-slate-600" />
          <div>
            <h4 className="text-slate-300 font-bold font-display">No Products Found</h4>
            <p className="text-xs text-slate-500 mt-1">Add items to your catalog to unlock invoices and purchase orders.</p>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border-white/5 overflow-hidden">
          <table className="w-full text-left border-collapse text-xs text-slate-300">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 border-b border-white/5">
                <th className="p-4 font-semibold">SKU / Name</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">HSN Code</th>
                <th className="p-4 font-semibold">Selling Price</th>
                <th className="p-4 font-semibold">Purchase Cost</th>
                <th className="p-4 font-semibold">Stock Status</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const isLowStock = p.openingStock <= p.minStock;
                return (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-100">{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{p.sku}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-white/5 text-slate-300 px-2 py-0.5 rounded font-medium uppercase text-[10px]">
                        {p.type}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">{p.hsn}</td>
                    <td className="p-4 font-medium text-slate-200">₹{p.sellingPrice.toLocaleString()}</td>
                    <td className="p-4 font-medium text-slate-400">₹{p.purchasePrice.toLocaleString()}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${isLowStock ? "bg-rose-500" : "bg-emerald-500"}`} />
                        <span className="font-semibold">{p.openingStock} units</span>
                        <span className="text-[10px] text-slate-500">Min: {p.minStock}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => alert(`Product ID: ${p.id}`)}
                        className="text-brand-400 hover:text-brand-300 font-semibold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-brand-400" />
                <h3 className="text-lg font-bold font-display text-slate-200">Create New Catalog Product</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto max-h-[70vh] pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Product SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SKU-STEEL-500"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Raw Steel Bar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="product">Physical Product</option>
                    <option value="service">Service</option>
                    <option value="digital">Digital File</option>
                    <option value="composite">Composite Kit</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">HSN Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 7208"
                    value={hsn}
                    onChange={(e) => setHsn(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Category *</label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Brand</label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="">-- None --</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Unit *</label>
                  <select
                    required
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="">-- Choose Unit --</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Selling Price *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg pl-6 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Purchase Cost *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg pl-6 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Tax Rate (%) *</label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="number"
                      required
                      min="0"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Opening Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={openingStock}
                    onChange={(e) => setOpeningStock(Number(e.target.value))}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Min Stock Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none font-semibold text-rose-300"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Max Stock Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={maxStock}
                    onChange={(e) => setMaxStock(Number(e.target.value))}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                <label className="text-xs font-semibold text-slate-400 uppercase">Inventory Valuation Method</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="valuationMethod"
                      value="fifo"
                      checked={valuationMethod === "fifo"}
                      onChange={() => setValuationMethod("fifo")}
                      className="accent-brand-500"
                    />
                    <span>First-In, First-Out (FIFO)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="valuationMethod"
                      value="weighted_average"
                      checked={valuationMethod === "weighted_average"}
                      onChange={() => setValuationMethod("weighted_average")}
                      className="accent-brand-500"
                    />
                    <span>Weighted Average Cost (WAC)</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-4 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-white/10 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addProductMutation.isPending}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  {addProductMutation.isPending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>Create Product</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

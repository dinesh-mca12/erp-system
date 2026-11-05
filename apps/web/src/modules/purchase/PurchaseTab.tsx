import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  ShoppingCart,
  Plus,
  RefreshCw,
  Search,
  FileText,
  X,
} from "lucide-react";
import { PurchaseOrder, Bill, Vendor, Product } from "@flowos/shared-types";

export default function PurchaseTab() {
  const token = useAppSelector((state) => state.auth.token);
  const queryClient = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState<"orders" | "bills">("orders");
  const [search, setSearch] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  // Queries
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["vendors", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/vendors", { headers: { Authorization: `Bearer ${token}` } });
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

  const { data: purchaseOrders = [], refetch: refetchOrders } = useQuery<PurchaseOrder[]>({
    queryKey: ["purchase_orders", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/purchase/orders", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: bills = [], refetch: refetchBills } = useQuery<Bill[]>({
    queryKey: ["bills", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/purchase/bills", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  // Mutations
  const createPoMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/purchase/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to create purchase order");
      return r.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      setIsPoModalOpen(false);
      showToast(`✓ Purchase Order "${res.data.orderNumber}" generated successfully.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  const createBillMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/purchase/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to create bill");
      return r.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setIsBillModalOpen(false);
      showToast(`✓ Bill "${res.data.billNumber}" recorded and stock updated.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  // PO Form states
  const [poNumber, setPoNumber] = useState("");
  const [poVendorId, setPoVendorId] = useState("");
  const [poItems, setPoItems] = useState<{ productId: string; quantity: number; unitPrice: number; taxRate: number }[]>([
    { productId: "", quantity: 1, unitPrice: 0, taxRate: 0 }
  ]);

  // Bill Form states
  const [billNumber, setBillNumber] = useState("");
  const [billVendorId, setBillVendorId] = useState("");
  const [billItems, setBillItems] = useState<{ productId: string; quantity: number; unitPrice: number; taxRate: number }[]>([
    { productId: "", quantity: 1, unitPrice: 0, taxRate: 0 }
  ]);
  const [dueDate, setDueDate] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePoItemChange = (idx: number, field: string, val: any) => {
    const next = [...poItems];
    if (field === "productId") {
      const prod = products.find(p => p.id === val);
      next[idx] = {
        productId: val,
        quantity: next[idx].quantity,
        unitPrice: prod ? prod.purchasePrice : 0,
        taxRate: prod ? prod.taxRate : 0
      };
    } else {
      next[idx] = { ...next[idx], [field]: val };
    }
    setPoItems(next);
  };

  const handleBillItemChange = (idx: number, field: string, val: any) => {
    const next = [...billItems];
    if (field === "productId") {
      const prod = products.find(p => p.id === val);
      next[idx] = {
        productId: val,
        quantity: next[idx].quantity,
        unitPrice: prod ? prod.purchasePrice : 0,
        taxRate: prod ? prod.taxRate : 0
      };
    } else {
      next[idx] = { ...next[idx], [field]: val };
    }
    setBillItems(next);
  };

  const calculateTotals = (items: any[]) => {
    let subTotal = 0;
    let taxAmount = 0;
    items.forEach(it => {
      const lineTotal = it.quantity * it.unitPrice;
      const taxLine = lineTotal * (it.taxRate / 100);
      subTotal += lineTotal;
      taxAmount += taxLine;
    });
    return {
      subTotal,
      taxAmount,
      grandTotal: subTotal + taxAmount
    };
  };

  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poNumber || !poVendorId) return;

    const { subTotal, taxAmount, grandTotal } = calculateTotals(poItems);

    const payload = {
      orderNumber: poNumber,
      vendorId: poVendorId,
      subTotal,
      taxAmount,
      grandTotal,
      status: "draft",
      currencyCode: "INR",
      exchangeRate: 1,
      baseCurrencyAmount: grandTotal,
      items: poItems.map(it => ({
        productId: it.productId,
        description: products.find(p => p.id === it.productId)?.name || "Item description",
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        taxRate: Number(it.taxRate),
        lineTotal: Number(it.quantity) * Number(it.unitPrice)
      }))
    };

    createPoMutation.mutate(payload);
  };

  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNumber || !billVendorId || !dueDate) return;

    const { subTotal, taxAmount, grandTotal } = calculateTotals(billItems);

    const payload = {
      billNumber,
      vendorId: billVendorId,
      dueDate,
      subTotal,
      taxAmount,
      grandTotal,
      amountPaid: 0,
      amountDue: grandTotal,
      status: "unpaid",
      currencyCode: "INR",
      exchangeRate: 1,
      baseCurrencyAmount: grandTotal,
      items: billItems.map(it => ({
        productId: it.productId,
        description: products.find(p => p.id === it.productId)?.name || "Item description",
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        taxRate: Number(it.taxRate),
        lineTotal: Number(it.quantity) * Number(it.unitPrice)
      }))
    };

    createBillMutation.mutate(payload);
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
          <h2 className="text-2xl font-bold font-display tracking-wide text-slate-200">Purchasing & Vendor Invoicing</h2>
          <p className="text-xs text-slate-400 mt-1">Issue POs, record inbound bills, adjust inventory, and track outstanding balances.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeSubTab === "orders") {
                setPoNumber("PO-2026-" + Math.floor(1000 + Math.random() * 9000));
                setIsPoModalOpen(true);
              } else {
                setBillNumber("BILL-2026-" + Math.floor(1000 + Math.random() * 9000));
                setIsBillModalOpen(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:translate-y-0.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10"
          >
            <Plus className="h-4 w-4" />
            <span>Record {activeSubTab === "orders" ? "Purchase Order" : "Bill"}</span>
          </button>
          <button
            onClick={() => {
              refetchOrders();
              refetchBills();
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
          onClick={() => setActiveSubTab("orders")}
          className={`pb-3 transition-colors ${activeSubTab === "orders" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Purchase Orders
        </button>
        <button
          onClick={() => setActiveSubTab("bills")}
          className={`pb-3 transition-colors ${activeSubTab === "bills" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Bills / Vendor Invoices
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex items-center gap-4 bg-slate-950/20 px-4 py-3 rounded-xl border border-white/5">
        <Search className="h-4.5 w-4.5 text-slate-500" />
        <input
          type="text"
          placeholder="Filter purchase transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent text-sm text-slate-200 focus:outline-none w-full"
        />
      </div>

      {/* LIST GIRD */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[60vh] pr-1">
        {activeSubTab === "orders" && (
          <div className="flex flex-col gap-3">
            {purchaseOrders
              .filter(po => po.orderNumber.toLowerCase().includes(search.toLowerCase()))
              .map(po => {
                const vend = vendors.find(v => v.id === po.vendorId);
                return (
                  <div key={po.id} className="glass-card p-4 rounded-xl flex items-center justify-between border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                        <ShoppingCart className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold font-display text-slate-200">{po.orderNumber}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Vendor: {vend ? vend.name : "Unknown Vendor"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-slate-200 font-display">₹{po.grandTotal.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{po.items.length} line items</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">
                        {po.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            {purchaseOrders.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No purchase orders found.</p>}
          </div>
        )}

        {activeSubTab === "bills" && (
          <div className="flex flex-col gap-3">
            {bills
              .filter(b => b.billNumber.toLowerCase().includes(search.toLowerCase()))
              .map(b => {
                const vend = vendors.find(v => v.id === b.vendorId);
                return (
                  <div key={b.id} className="glass-card p-4 rounded-xl flex items-center justify-between border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold font-display text-slate-200">{b.billNumber}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Vendor: {vend ? vend.name : "Unknown Vendor"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-slate-200 font-display">₹{b.grandTotal.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Due: {new Date(b.dueDate).toLocaleDateString()}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400">
                        {b.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            {bills.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No vendor bills recorded.</p>}
          </div>
        )}
      </div>

      {/* CREATE PO MODAL */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-xl p-6 rounded-2xl flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold font-display text-slate-200">Issue Purchase Order</h3>
              <button onClick={() => setIsPoModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="flex flex-col gap-4 text-sm text-slate-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">PO Number</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Vendor Supplier</label>
                  <select
                    value={poVendorId}
                    onChange={(e) => setPoVendorId(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Line Items</span>
                  <button
                    type="button"
                    onClick={() => setPoItems([...poItems, { productId: "", quantity: 1, unitPrice: 0, taxRate: 0 }])}
                    className="text-xs text-brand-400 hover:text-brand-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Row
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {poItems.map((it, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={it.productId}
                        onChange={(e) => handlePoItemChange(idx, "productId", e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 text-xs w-44 focus:outline-none"
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => handlePoItemChange(idx, "quantity", Number(e.target.value))}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 text-xs w-16"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Cost"
                        value={it.unitPrice}
                        onChange={(e) => handlePoItemChange(idx, "unitPrice", Number(e.target.value))}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 text-xs w-20"
                        required
                      />
                      <span className="text-xs text-slate-300 w-24 text-right font-semibold">
                        ₹{(it.quantity * it.unitPrice).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-rose-500/10 text-rose-400 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 flex justify-between text-sm font-bold text-slate-200">
                <span>Estimated PO Value</span>
                <span>₹{calculateTotals(poItems).grandTotal.toLocaleString()}</span>
              </div>

              <button
                type="submit"
                disabled={createPoMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors"
              >
                {createPoMutation.isPending ? "Creating PO..." : "Issue Purchase Order"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RECORD BILL MODAL */}
      {isBillModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-xl p-6 rounded-2xl flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold font-display text-slate-200">Record Vendor Bill</h3>
              <button onClick={() => setIsBillModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateBill} className="flex flex-col gap-4 text-sm text-slate-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Bill / Invoice Number</label>
                  <input
                    type="text"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Vendor Supplier</label>
                  <select
                    value={billVendorId}
                    onChange={(e) => setBillVendorId(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200"
                  required
                />
              </div>

              <div className="border-t border-white/5 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Line Items</span>
                  <button
                    type="button"
                    onClick={() => setBillItems([...billItems, { productId: "", quantity: 1, unitPrice: 0, taxRate: 0 }])}
                    className="text-xs text-brand-400 hover:text-brand-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Row
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {billItems.map((it, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={it.productId}
                        onChange={(e) => handleBillItemChange(idx, "productId", e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 text-xs w-44 focus:outline-none"
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Qty: {p.openingStock})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => handleBillItemChange(idx, "quantity", Number(e.target.value))}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 text-xs w-16"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Cost"
                        value={it.unitPrice}
                        onChange={(e) => handleBillItemChange(idx, "unitPrice", Number(e.target.value))}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 text-xs w-20"
                        required
                      />
                      <span className="text-xs text-slate-300 w-24 text-right font-semibold">
                        ₹{(it.quantity * it.unitPrice).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setBillItems(billItems.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-rose-500/10 text-rose-400 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 flex justify-between text-sm font-bold text-slate-200">
                <span>Grand Total (With GST)</span>
                <span>₹{calculateTotals(billItems).grandTotal.toLocaleString()}</span>
              </div>

              <button
                type="submit"
                disabled={createBillMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors"
              >
                {createBillMutation.isPending ? "Recording bill..." : "Verify & Log Bill"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

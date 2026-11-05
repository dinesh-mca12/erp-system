import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Printer,
  ChevronRight,
  Clock,
  X,
  CreditCard,
} from "lucide-react";
import { Invoice, SalesOrder, RetainerInvoice, CreditNote, Customer, Product } from "@flowos/shared-types";

export default function SalesTab() {
  const token = useAppSelector((state) => state.auth.token);
  const queryClient = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState<"invoices" | "orders" | "retainers" | "credit-notes">("invoices");
  const [search, setSearch] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  // Queries for Customers and Products
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/customers", { headers: { Authorization: `Bearer ${token}` } });
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

  // Queries for Sales Transactions
  const { data: invoices = [], refetch: refetchInvoices } = useQuery<Invoice[]>({
    queryKey: ["invoices", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/sales/invoices", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: salesOrders = [], refetch: refetchOrders } = useQuery<SalesOrder[]>({
    queryKey: ["sales_orders", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/sales/orders", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: retainers = [], refetch: refetchRetainers } = useQuery<RetainerInvoice[]>({
    queryKey: ["retainers", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/sales/retainers", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: creditNotes = [], refetch: refetchCreditNotes } = useQuery<CreditNote[]>({
    queryKey: ["credit_notes", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/sales/credit-notes", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/sales/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to create invoice");
      return r.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsInvoiceModalOpen(false);
      showToast(`✓ Invoice "${res.data.invoiceNumber}" generated successfully.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  const createOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to create sales order");
      return r.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["sales_orders"] });
      setIsOrderModalOpen(false);
      showToast(`✓ Sales Order "${res.data.orderNumber}" drafted successfully.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const r = await fetch(`/api/v1/sales/invoices/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amountPaid: amount }),
      });
      if (!r.ok) throw new Error((await r.json()).error?.message || "Failed to record payment");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      showToast(`✓ Payment of ₹${paymentAmount} recorded against invoice.`);
    },
    onError: (err: any) => showToast(`✗ Error: ${err.message}`),
  });

  // Invoice Form Fields state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [dueDate, setDueDate] = useState("");
  const [discount, setDiscount] = useState(0);
  const [invoiceItems, setInvoiceItems] = useState<{ productId: string; quantity: number; unitPrice: number; taxRate: number }[]>([
    { productId: "", quantity: 1, unitPrice: 0, taxRate: 0 }
  ]);

  // Sales Order Form state
  const [orderNumber, setOrderNumber] = useState("");
  const [orderCustomerId, setOrderCustomerId] = useState("");
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: number; unitPrice: number; taxRate: number }[]>([
    { productId: "", quantity: 1, unitPrice: 0, taxRate: 0 }
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleInvoiceItemChange = (idx: number, field: string, val: any) => {
    const next = [...invoiceItems];
    if (field === "productId") {
      const prod = products.find(p => p.id === val);
      next[idx] = {
        productId: val,
        quantity: next[idx].quantity,
        unitPrice: prod ? prod.sellingPrice : 0,
        taxRate: prod ? prod.taxRate : 0
      };
    } else {
      next[idx] = { ...next[idx], [field]: val };
    }
    setInvoiceItems(next);
  };

  const calculateTotals = (items: typeof invoiceItems, discountVal: number) => {
    let subTotal = 0;
    let taxAmount = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    items.forEach(it => {
      const lineTotal = it.quantity * it.unitPrice;
      const taxLine = lineTotal * (it.taxRate / 100);
      subTotal += lineTotal;
      taxAmount += taxLine;
      cgst += taxLine / 2;
      sgst += taxLine / 2;
    });

    const grandTotal = Math.max(0, subTotal + taxAmount - discountVal);
    return {
      subTotal,
      taxAmount,
      grandTotal,
      cgst,
      sgst,
      igst
    };
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber || !customerId || !dueDate) return;

    const { subTotal, taxAmount, grandTotal, cgst, sgst, igst } = calculateTotals(invoiceItems, discount);
    const customer = customers.find(c => c.id === customerId);

    const payload = {
      invoiceNumber,
      customerId,
      dueDate,
      currencyCode,
      exchangeRate: Number(exchangeRate),
      baseCurrencyAmount: grandTotal * Number(exchangeRate),
      subTotal,
      taxAmount,
      discount: Number(discount),
      grandTotal,
      amountPaid: 0,
      amountDue: grandTotal,
      status: "draft",
      gstDetails: {
        gstin: customer?.gstin || "",
        cgst,
        sgst,
        igst
      },
      items: invoiceItems.map(it => ({
        productId: it.productId,
        description: products.find(p => p.id === it.productId)?.name || "Item description",
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        taxRate: Number(it.taxRate),
        lineTotal: Number(it.quantity) * Number(it.unitPrice)
      }))
    };

    createInvoiceMutation.mutate(payload);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !orderCustomerId) return;

    const { subTotal, taxAmount, grandTotal } = calculateTotals(orderItems, 0);

    const payload = {
      orderNumber,
      customerId: orderCustomerId,
      subTotal,
      taxAmount,
      discount: 0,
      grandTotal,
      status: "draft",
      currencyCode: "INR",
      exchangeRate: 1,
      baseCurrencyAmount: grandTotal,
      items: orderItems.map(it => ({
        productId: it.productId,
        description: products.find(p => p.id === it.productId)?.name || "Item description",
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        taxRate: Number(it.taxRate),
        lineTotal: Number(it.quantity) * Number(it.unitPrice)
      }))
    };

    createOrderMutation.mutate(payload);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentAmount) return;
    recordPaymentMutation.mutate({ id: selectedInvoice.id, amount: Number(paymentAmount) });
  };

  const handleTriggerPrint = () => {
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
      <div className="flex items-center justify-between border-b border-white/5 pb-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-wide text-slate-200">Sales Desk</h2>
          <p className="text-xs text-slate-400 mt-1">Create sales orders, verify invoices, apply retainer credits, and log credit payouts.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeSubTab === "invoices") {
                setInvoiceNumber("INV-2026-" + Math.floor(1000 + Math.random() * 9000));
                setIsInvoiceModalOpen(true);
              } else {
                setOrderNumber("SO-2026-" + Math.floor(1000 + Math.random() * 9000));
                setIsOrderModalOpen(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:translate-y-0.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10"
          >
            <Plus className="h-4 w-4" />
            <span>Generate {activeSubTab === "invoices" ? "Invoice" : "Sales Order"}</span>
          </button>
          <button
            onClick={() => {
              refetchInvoices();
              refetchOrders();
              refetchRetainers();
              refetchCreditNotes();
            }}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* SUB TABS NAVIGATION */}
      <div className="flex border-b border-white/5 gap-6 text-sm font-medium print:hidden">
        <button
          onClick={() => setActiveSubTab("invoices")}
          className={`pb-3 transition-colors ${activeSubTab === "invoices" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Invoices
        </button>
        <button
          onClick={() => setActiveSubTab("orders")}
          className={`pb-3 transition-colors ${activeSubTab === "orders" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Sales Orders
        </button>
        <button
          onClick={() => setActiveSubTab("retainers")}
          className={`pb-3 transition-colors ${activeSubTab === "retainers" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Retainers
        </button>
        <button
          onClick={() => setActiveSubTab("credit-notes")}
          className={`pb-3 transition-colors ${activeSubTab === "credit-notes" ? "text-brand-400 border-b-2 border-brand-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Credit Notes
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex items-center gap-4 bg-slate-950/20 px-4 py-3 rounded-xl border border-white/5 print:hidden">
        <Search className="h-4.5 w-4.5 text-slate-500" />
        <input
          type="text"
          placeholder="Filter transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent text-sm text-slate-200 focus:outline-none w-full"
        />
      </div>

      {/* MAIN DATA VIEWS */}
      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* LIST SECTION */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[60vh] pr-1 print:hidden">
          {activeSubTab === "invoices" && (
            <div className="flex flex-col gap-3">
              {invoices
                .filter(inv => inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()))
                .map(inv => {
                  const cust = customers.find(c => c.id === inv.customerId);
                  return (
                    <div
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className={`glass-card p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all border ${selectedInvoice?.id === inv.id ? "border-brand-500/50 bg-slate-900/40" : "border-white/5 hover:bg-white/5"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold font-display text-slate-200">{inv.invoiceNumber}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{cust ? cust.name : "Unknown Client"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-slate-200 font-display">₹{inv.grandTotal.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Due: ₹{inv.amountDue.toLocaleString()}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : inv.status === "partially_paid" ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"}`}>
                          {inv.status.toUpperCase()}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>
                  );
                })}
              {invoices.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No invoices found.</p>}
            </div>
          )}

          {activeSubTab === "orders" && (
            <div className="flex flex-col gap-3">
              {salesOrders
                .filter(so => so.orderNumber.toLowerCase().includes(search.toLowerCase()))
                .map(so => {
                  const cust = customers.find(c => c.id === so.customerId);
                  return (
                    <div
                      key={so.id}
                      className="glass-card p-4 rounded-xl flex items-center justify-between border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-violet-500/10 text-violet-400">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold font-display text-slate-200">{so.orderNumber}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{cust ? cust.name : "Unknown Client"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-slate-200 font-display">₹{so.grandTotal.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{so.items.length} line items</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${so.status === "approved" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
                          {so.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              {salesOrders.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No sales orders found.</p>}
            </div>
          )}

          {activeSubTab === "retainers" && (
            <div className="flex flex-col gap-3">
              {retainers.map(ret => {
                const cust = customers.find(c => c.id === ret.customerId);
                return (
                  <div key={ret.id} className="glass-card p-4 rounded-xl flex items-center justify-between border border-white/5">
                    <div>
                      <p className="font-bold text-slate-300">Retainer Credit Ledger</p>
                      <p className="text-xs text-slate-400 mt-1">Client: {cust ? cust.name : "Unknown"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-100 font-display">₹{ret.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-indigo-400 font-semibold mt-1">Status: {ret.status}</p>
                    </div>
                  </div>
                );
              })}
              {retainers.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No retainer credits issued.</p>}
            </div>
          )}

          {activeSubTab === "credit-notes" && (
            <div className="flex flex-col gap-3">
              {creditNotes.map(cn => {
                const cust = customers.find(c => c.id === cn.customerId);
                return (
                  <div key={cn.id} className="glass-card p-4 rounded-xl flex items-center justify-between border border-white/5">
                    <div>
                      <p className="font-bold text-slate-300">Credit Issue note</p>
                      <p className="text-xs text-slate-500 mt-0.5">Reason: {cn.reason}</p>
                      <p className="text-xs text-slate-400 mt-1">Client: {cust ? cust.name : "Unknown"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-rose-400 font-display">₹{cn.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Action: {cn.action}</p>
                    </div>
                  </div>
                );
              })}
              {creditNotes.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No credit notes found.</p>}
            </div>
          )}
        </div>

        {/* DETAILED WORKSTATION PANEL */}
        {selectedInvoice && (
          <div className="w-96 glass-card p-5 rounded-2xl flex flex-col gap-4 max-h-[60vh] overflow-y-auto print:absolute print:inset-0 print:w-full print:bg-white print:text-black">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 print:hidden">
              <h3 className="font-bold font-display text-slate-200">Invoice Details</h3>
              <button onClick={() => setSelectedInvoice(null)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-4.5 w-4.5 text-slate-400" />
              </button>
            </div>

            {/* Print Header mock */}
            <div className="hidden print:block mb-6">
              <h1 className="text-2xl font-bold font-display">Apex Labs India</h1>
              <p className="text-sm">GSTIN: 27AAPCA1234F1Z5</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Invoice No.</span>
                <span className="text-xs font-bold text-slate-200">{selectedInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Due Date</span>
                <span className="text-xs font-semibold text-slate-200">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Customer</span>
                <span className="text-xs font-semibold text-slate-200">
                  {customers.find(c => c.id === selectedInvoice.customerId)?.name || "Unknown"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Currency</span>
                <span className="text-xs font-semibold text-indigo-300">{selectedInvoice.currencyCode}</span>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Line Items</p>
              <div className="flex flex-col gap-2">
                {selectedInvoice.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-1">
                    <span className="text-slate-300 truncate max-w-[150px]">{it.description}</span>
                    <span className="text-slate-200">
                      {it.quantity} x ₹{it.unitPrice.toLocaleString()} = <b className="text-slate-100">₹{it.lineTotal.toLocaleString()}</b>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 flex flex-col gap-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{selectedInvoice.subTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax Amount (GST)</span>
                <span>₹{selectedInvoice.taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>Discount Applied</span>
                <span>-₹{selectedInvoice.discount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-100 border-t border-white/5 pt-2">
                <span>Grand Total</span>
                <span>₹{selectedInvoice.grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-emerald-400">
                <span>Amount Paid</span>
                <span>₹{selectedInvoice.amountPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-400">
                <span>Balance Due</span>
                <span>₹{selectedInvoice.amountDue.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4 print:hidden">
              {selectedInvoice.status !== "paid" && (
                <button
                  onClick={() => {
                    setPaymentAmount(selectedInvoice.amountDue.toString());
                    setIsPaymentModalOpen(true);
                  }}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Pay Invoice</span>
                </button>
              )}
              <button
                onClick={handleTriggerPrint}
                className="py-2 px-3 border border-white/10 hover:bg-white/5 text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                <span>Print Copy</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE INVOICE MODAL */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl p-6 rounded-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold font-display text-slate-200">New Tax Invoice</h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="flex flex-col gap-4 text-sm text-slate-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Customer</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Currency</label>
                  <select
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Exchange Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200"
                  />
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
              </div>

              <div className="border-t border-white/5 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Line Items</span>
                  <button
                    type="button"
                    onClick={() => setInvoiceItems([...invoiceItems, { productId: "", quantity: 1, unitPrice: 0, taxRate: 0 }])}
                    className="text-xs text-brand-400 hover:text-brand-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Row
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {invoiceItems.map((it, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={it.productId}
                        onChange={(e) => handleInvoiceItemChange(idx, "productId", e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 text-xs w-48 focus:outline-none"
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
                        onChange={(e) => handleInvoiceItemChange(idx, "quantity", Number(e.target.value))}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 text-xs w-16"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={it.unitPrice}
                        onChange={(e) => handleInvoiceItemChange(idx, "unitPrice", Number(e.target.value))}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 text-xs w-24"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Tax %"
                        value={it.taxRate}
                        onChange={(e) => handleInvoiceItemChange(idx, "taxRate", Number(e.target.value))}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 text-xs w-16"
                      />
                      <span className="text-xs text-slate-300 w-24 text-right font-semibold">
                        ₹{(it.quantity * it.unitPrice).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setInvoiceItems(invoiceItems.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-rose-500/10 text-rose-400 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 flex flex-col gap-2 w-72 self-end text-xs text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Discount (₹)</span>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-slate-200 w-24 text-right"
                  />
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-bold text-slate-200">
                  <span>Grand Total</span>
                  <span>₹{calculateTotals(invoiceItems, discount).grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={createInvoiceMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors"
              >
                {createInvoiceMutation.isPending ? "Generating Invoice..." : "Verify & Generate Invoice"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SALES ORDER MODAL */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-xl p-6 rounded-2xl flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold font-display text-slate-200">New Sales Order</h3>
              <button onClick={() => setIsOrderModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="flex flex-col gap-4 text-sm text-slate-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Order Number</label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Customer</label>
                  <select
                    value={orderCustomerId}
                    onChange={(e) => setOrderCustomerId(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Line Items</span>
                  <button
                    type="button"
                    onClick={() => setOrderItems([...orderItems, { productId: "", quantity: 1, unitPrice: 0, taxRate: 0 }])}
                    className="text-xs text-brand-400 hover:text-brand-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Row
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {orderItems.map((it, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={it.productId}
                        onChange={(e) => {
                          const next = [...orderItems];
                          const prod = products.find(p => p.id === e.target.value);
                          next[idx] = {
                            productId: e.target.value,
                            quantity: it.quantity,
                            unitPrice: prod ? prod.sellingPrice : 0,
                            taxRate: prod ? prod.taxRate : 0
                          };
                          setOrderItems(next);
                        }}
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
                        onChange={(e) => {
                          const next = [...orderItems];
                          next[idx] = { ...next[idx], quantity: Number(e.target.value) };
                          setOrderItems(next);
                        }}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 text-xs w-16"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={it.unitPrice}
                        onChange={(e) => {
                          const next = [...orderItems];
                          next[idx] = { ...next[idx], unitPrice: Number(e.target.value) };
                          setOrderItems(next);
                        }}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 text-xs w-20"
                        required
                      />
                      <span className="text-xs text-slate-300 w-24 text-right font-semibold">
                        ₹{(it.quantity * it.unitPrice).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-rose-500/10 text-rose-400 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 flex justify-between text-sm font-bold text-slate-200">
                <span>Estimated Grand Total</span>
                <span>₹{calculateTotals(orderItems, 0).grandTotal.toLocaleString()}</span>
              </div>

              <button
                type="submit"
                disabled={createOrderMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors"
              >
                {createOrderMutation.isPending ? "Creating..." : "Save Draft Sales Order"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold font-display text-slate-200">Record Payout / Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="flex flex-col gap-4 text-sm text-slate-300">
              <p className="text-xs text-slate-400">Enter the payment amount cleared by the client for invoice <b>{selectedInvoice.invoiceNumber}</b>.</p>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase">Payment Amount (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={selectedInvoice.amountDue}
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-slate-200 text-center font-bold font-display text-lg"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={recordPaymentMutation.isPending}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors"
              >
                {recordPaymentMutation.isPending ? "Updating ledger..." : "Confirm Payout"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

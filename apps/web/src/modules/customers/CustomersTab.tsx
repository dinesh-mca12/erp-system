import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  UserPlus,
  Mail,
  Phone,
  FileText,
  MapPin,
  X,
  Check,
  CreditCard,
} from "lucide-react";
import { Customer } from "@flowos/shared-types";

export default function CustomersTab() {
  const token = useAppSelector((state) => state.auth.token);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [zip, setZip] = useState("");
  const [creditLimit, setCreditLimit] = useState<number>(50000);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch Customers
  const { data: customers = [], isLoading, isError, refetch } = useQuery<Customer[]>({
    queryKey: ["customers", token],
    queryFn: async () => {
      const response = await fetch("/api/v1/customers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load customers.");
      const json = await response.json();
      return json.data;
    },
    enabled: !!token,
  });

  // 2. Add Customer Mutation
  const addCustomerMutation = useMutation({
    mutationFn: async (newCustomer: any) => {
      const response = await fetch("/api/v1/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCustomer),
      });
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error?.message || "Failed to create customer.");
      }
      return response.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsModalOpen(false);
      showToast(`✓ Customer "${res.data.name}" added successfully.`);
      resetForm();
    },
    onError: (err: any) => {
      showToast(`✗ Error: ${err.message}`);
    },
  });

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setGstin("");
    setPan("");
    setStreet("");
    setCity("");
    setStateName("");
    setZip("");
    setCreditLimit(50000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addCustomerMutation.mutate({
      name,
      email: email || undefined,
      phone: phone || undefined,
      gstin: gstin || undefined,
      pan: pan || undefined,
      billingAddress: {
        street: street || undefined,
        city: city || undefined,
        state: stateName || undefined,
        zip: zip || undefined,
        country: "India",
      },
      shippingAddress: {
        street: street || undefined,
        city: city || undefined,
        state: stateName || undefined,
        zip: zip || undefined,
        country: "India",
      },
      creditLimit: Number(creditLimit),
      outstandingBalance: 0,
      currencyCode: "INR",
    });
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.gstin && c.gstin.toLowerCase().includes(search.toLowerCase()))
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
          <h2 className="text-2xl font-bold font-display tracking-wide text-slate-200">Customers Directory</h2>
          <p className="text-xs text-slate-400 mt-1">Manage client profiles, outstanding balances, and credit policies.</p>
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
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex items-center gap-4 bg-slate-950/20 p-4 rounded-xl border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, or GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>
      </div>

      {/* CUSTOMERS LIST */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : isError ? (
        <div className="text-center py-10 text-rose-400">
          <p>Failed to retrieve customers. Verify Express server connection.</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-2xl border-white/5 flex flex-col items-center gap-4">
          <Users className="h-12 w-12 text-slate-600" />
          <div>
            <h4 className="text-slate-300 font-bold font-display">No Customers Found</h4>
            <p className="text-xs text-slate-500 mt-1">Get started by creating your first customer contact.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((cust) => (
            <div key={cust.id} className="glass-card p-5 rounded-2xl border-white/5 hover:border-brand-500/25 transition-all flex flex-col gap-4 group">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-200 group-hover:text-brand-300 transition-colors font-display">
                    {cust.name}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono select-all block mt-0.5">{cust.id}</span>
                </div>
                <div className="bg-brand-500/10 text-brand-400 p-2 rounded-lg">
                  <Users className="h-5 w-5" />
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
                {cust.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    <span>{cust.email}</span>
                  </div>
                )}
                {cust.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    <span>{cust.phone}</span>
                  </div>
                )}
                {cust.gstin && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    <span className="font-mono">GSTIN: {cust.gstin}</span>
                  </div>
                )}
                {cust.billingAddress?.city && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    <span>{cust.billingAddress.city}, {cust.billingAddress.state || "India"}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-auto">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Outstanding</span>
                  <span className={`text-sm font-bold ${cust.outstandingBalance > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    ₹{cust.outstandingBalance.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Credit Limit</span>
                  <span className="text-xs text-slate-300 font-semibold">
                    ₹{cust.creditLimit?.toLocaleString() || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-brand-400" />
                <h3 className="text-lg font-bold font-display text-slate-200">Create New Customer</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto max-h-[70vh] pr-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Labs India"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. billing@apex.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">GSTIN (Tax ID)</label>
                  <input
                    type="text"
                    placeholder="15-character GSTIN"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">PAN Number</label>
                  <input
                    type="text"
                    placeholder="10-character PAN"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase">Billing Address</span>
                <div className="flex flex-col gap-1.5">
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Zip Code"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                <label className="text-xs font-semibold text-slate-400 uppercase">Credit Limit (INR)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
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
                  disabled={addCustomerMutation.isPending}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  {addCustomerMutation.isPending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>Create Customer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

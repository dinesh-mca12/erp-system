import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  Store,
  Search,
  Plus,
  RefreshCw,
  Mail,
  Phone,
  FileText,
  MapPin,
  X,
  Check,
  Star,
  Clock,
} from "lucide-react";
import { Vendor } from "@flowos/shared-types";

export default function VendorsTab() {
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
  const [rating, setRating] = useState<number>(4);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(7);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch Vendors
  const { data: vendors = [], isLoading, isError, refetch } = useQuery<Vendor[]>({
    queryKey: ["vendors", token],
    queryFn: async () => {
      const response = await fetch("/api/v1/vendors", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load vendors.");
      const json = await response.json();
      return json.data;
    },
    enabled: !!token,
  });

  // 2. Add Vendor Mutation
  const addVendorMutation = useMutation({
    mutationFn: async (newVendor: any) => {
      const response = await fetch("/api/v1/vendors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newVendor),
      });
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error?.message || "Failed to create vendor.");
      }
      return response.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setIsModalOpen(false);
      showToast(`✓ Vendor "${res.data.name}" added successfully.`);
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
    setRating(4);
    setLeadTimeDays(7);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addVendorMutation.mutate({
      name,
      email: email || undefined,
      phone: phone || undefined,
      gstin: gstin || undefined,
      pan: pan || undefined,
      address: {
        street: street || undefined,
        city: city || undefined,
        state: stateName || undefined,
        zip: zip || undefined,
        country: "India",
      },
      rating: Number(rating),
      leadTimeDays: Number(leadTimeDays),
      outstandingBalance: 0,
      currencyCode: "INR",
    });
  };

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.email && v.email.toLowerCase().includes(search.toLowerCase())) ||
    (v.gstin && v.gstin.toLowerCase().includes(search.toLowerCase()))
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
          <h2 className="text-2xl font-bold font-display tracking-wide text-slate-200">Vendors Directory</h2>
          <p className="text-xs text-slate-400 mt-1">Manage supplier contacts, metrics, and unpaid bills status.</p>
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
            <span>Add Vendor</span>
          </button>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex items-center gap-4 bg-slate-950/20 p-4 rounded-xl border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by vendor name, email, or GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>
      </div>

      {/* VENDORS LIST */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : isError ? (
        <div className="text-center py-10 text-rose-400">
          <p>Failed to retrieve vendors. Verify Express server connection.</p>
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-2xl border-white/5 flex flex-col items-center gap-4">
          <Store className="h-12 w-12 text-slate-600" />
          <div>
            <h4 className="text-slate-300 font-bold font-display">No Vendors Found</h4>
            <p className="text-xs text-slate-500 mt-1">Get started by adding your first supplier record.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map((vend) => (
            <div key={vend.id} className="glass-card p-5 rounded-2xl border-white/5 hover:border-brand-500/25 transition-all flex flex-col gap-4 group">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-200 group-hover:text-brand-300 transition-colors font-display">
                    {vend.name}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono select-all block mt-0.5">{vend.id}</span>
                </div>
                <div className="bg-brand-500/10 text-brand-400 p-2 rounded-lg">
                  <Store className="h-5 w-5" />
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
                {vend.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    <span>{vend.email}</span>
                  </div>
                )}
                {vend.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    <span>{vend.phone}</span>
                  </div>
                )}
                {vend.gstin && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    <span className="font-mono">GSTIN: {vend.gstin}</span>
                  </div>
                )}
                {vend.address?.city && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    <span>{vend.address.city}, {vend.address.state || "India"}</span>
                  </div>
                )}
              </div>

              {/* Vendor Specific Metrics */}
              <div className="flex gap-4 items-center bg-slate-900/50 p-2.5 rounded-lg border border-white/5 text-xs text-slate-400 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <span>{vend.rating || "N/A"}/5</span>
                </div>
                <div className="h-3 w-px bg-white/10" />
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{vend.leadTimeDays || 7}d Lead Time</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-auto">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Balance Owed</span>
                  <span className={`text-sm font-bold ${vend.outstandingBalance > 0 ? "text-amber-400" : "text-slate-300"}`}>
                    ₹{vend.outstandingBalance.toLocaleString()}
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
                <Plus className="h-5 w-5 text-brand-400" />
                <h3 className="text-lg font-bold font-display text-slate-200">Create New Vendor</h3>
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
                <label className="text-xs font-semibold text-slate-400 uppercase">Vendor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Steel Corp India"
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
                    placeholder="e.g. orders@steelcorp.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 22 12345678"
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
                <span className="text-xs font-bold text-slate-400 uppercase">Vendor Address</span>
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

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Vendor Rating (0-5)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.5"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Lead Time (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
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
                  disabled={addVendorMutation.isPending}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  {addVendorMutation.isPending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>Create Vendor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

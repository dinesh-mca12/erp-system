import { useState } from "react";
import { useAppDispatch } from "../../app/hooks";
import { setCredentials } from "../../app/authSlice";
import { Sparkles, Mail, Lock, Building, ArrowRight, Shield } from "lucide-react";

export default function LoginPortal() {
  const dispatch = useAppDispatch();
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  
  // States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const url = isSignUp ? "/api/v1/auth/register-company" : "/api/v1/auth/login";
      const payload = isSignUp
        ? { companyName, email, password }
        : { email, password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Authentication process failed.");
      }

      if (isSignUp) {
        setSuccessMsg("✓ Company Registered Successfully! Logging you in...");
        setTimeout(() => {
          // Log in with the registered credentials
          dispatch(
            setCredentials({
              user: {
                uid: `mock-user-${json.data.companyId}`,
                email: email,
                role: "company_admin",
                companyId: json.data.companyId,
                branchIds: [json.data.branchId],
              },
              token: `mock_company_admin_${json.data.companyId}`,
            })
          );
        }, 1500);
      } else {
        dispatch(
          setCredentials({
            user: json.data.user,
            token: json.data.token,
          })
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const loadQuickDemo = (role: "admin" | "custom") => {
    if (role === "admin") {
      setEmail("admin@flowos.com");
      setPassword("adminpassword");
      setIsSignUp(false);
    } else {
      setCompanyName("Acme Logistics Group");
      setEmail("ceo@acmelogistics.com");
      setPassword("acmepassword123");
      setIsSignUp(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col justify-center items-center p-6 text-slate-100 relative overflow-hidden font-sans">
      {/* Decorative premium light glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#8b5cf6]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 select-none pointer-events-none"></div>

      <div className="w-full max-w-md z-10 font-sans">
        {/* LOGO AREA */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4 select-none animate-pulse">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-[10px] tracking-wider uppercase font-bold text-violet-300">FlowOS Enterprise Platform</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Cloud ERP Login
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            Real-world ready deployment workspace for cloud financials and logistics.
          </p>
        </div>

        {/* AUTH CARD */}
        <div className="glass-card p-8 rounded-3xl shadow-2xl relative border border-white/5 bg-slate-950/45">
          {/* TAB SWITCHER */}
          <div className="flex gap-2 p-1.5 bg-slate-950 rounded-xl border border-white/5 mb-6 text-xs font-bold">
            <button
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer ${
                !isSignUp ? "bg-violet-600 text-white font-bold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsSignUp(true);
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer ${
                isSignUp ? "bg-violet-600 text-white font-bold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Register Company
            </button>
          </div>

          {/* STATUS NOTIFICATIONS */}
          {errorMsg && (
            <div className="mb-4 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold text-center">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold text-center">
              {successMsg}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
            {isSignUp && (
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">New Company Name</label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Enter company legal name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 focus:border-violet-500 focus:outline-none rounded-xl pl-10 pr-4 py-3 text-slate-200 transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 focus:border-violet-500 focus:outline-none rounded-xl pl-10 pr-4 py-3 text-slate-200 transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="Enter login password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 focus:border-violet-500 focus:outline-none rounded-xl pl-10 pr-4 py-3 text-slate-200 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-violet-600 hover:bg-violet-500 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-white disabled:bg-slate-800 disabled:text-slate-500 hover:shadow-lg hover:shadow-violet-500/10 cursor-pointer"
            >
              {loading ? (
                <span>Processing Security Verification...</span>
              ) : (
                <>
                  <span>{isSignUp ? "Register and Login" : "Authenticate Access"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* SANDBOX CONTROLS */}
          <div className="mt-6 border-t border-white/5 pt-4">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2.5 text-center flex items-center justify-center gap-1.5">
              <Shield className="h-3 w-3 text-slate-500" /> Sandbox Quick Credentials
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadQuickDemo("admin")}
                className="flex-1 py-2 border border-white/5 hover:border-violet-500/30 bg-slate-950/40 rounded-xl text-[10px] font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Use Admin Demo
              </button>
              <button
                type="button"
                onClick={() => loadQuickDemo("custom")}
                className="flex-1 py-2 border border-white/5 hover:border-violet-500/30 bg-slate-950/40 rounded-xl text-[10px] font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Pre-fill New Company
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

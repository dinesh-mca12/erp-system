import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Users,
  Store,
  Settings,
  ChevronRight,
  LogOut,
  User,
  Receipt,
  ShoppingCart,
  Briefcase,
  BookOpen,
  Landmark,
  UserCheck,
  Archive,
  Activity,
  CheckSquare,
  MessageSquare,
} from "lucide-react";
import Dashboard from "./Dashboard";
import ProductsTab from "../products/ProductsTab";
import CustomersTab from "../customers/CustomersTab";
import VendorsTab from "../vendors/VendorsTab";
import TaxesTab from "../settings/TaxesTab";
import SalesTab from "../sales/SalesTab";
import PurchaseTab from "../purchase/PurchaseTab";
import ProjectsTab from "../projects/ProjectsTab";
import AccountingTab from "../accounting/AccountingTab";
import BankingTab from "../banking/BankingTab";
import HrTab from "../hr/HrTab";
import InventoryControlTab from "../inventory/InventoryControlTab";
import AuditTab from "../audit/AuditTab";
import EmployeeTab from "../employees/EmployeeTab";
import TasksTab from "../tasks/TasksTab";
import ChatTab from "../chat/ChatTab";
import LoginPortal from "../auth/LoginPortal";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { clearCredentials } from "../../app/authSlice";

type TabType = "dashboard" | "sales" | "purchase" | "projects" | "accounting" | "banking" | "hr" | "employees" | "tasks" | "chat" | "warehouses" | "audit" | "products" | "customers" | "vendors" | "settings";

export default function SidebarLayout() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "sales", label: "Sales & Invoices", icon: Receipt },
    { id: "purchase", label: "Purchases & Bills", icon: ShoppingCart },
    { id: "projects", label: "Projects & Time", icon: Briefcase },
    { id: "accounting", label: "Financials & Ledger", icon: BookOpen },
    { id: "banking", label: "Banking & Vault", icon: Landmark },
    { id: "hr", label: "HR & Payroll", icon: UserCheck },
    { id: "employees", label: "Staff Directory", icon: Users },
    { id: "tasks", label: "Work Tasks", icon: CheckSquare },
    { id: "chat", label: "Internal Chat", icon: MessageSquare },
    { id: "warehouses", label: "Warehouse & Transfers", icon: Archive },
    { id: "audit", label: "System Audit Logs", icon: Activity },
    { id: "products", label: "Products & Stock", icon: Package },
    { id: "customers", label: "Customers", icon: Users },
    { id: "vendors", label: "Vendors", icon: Store },
    { id: "settings", label: "Master Settings", icon: Settings },
  ];

  if (!isAuthenticated) {
    return <LoginPortal />;
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "sales":
        return <SalesTab />;
      case "purchase":
        return <PurchaseTab />;
      case "projects":
        return <ProjectsTab />;
      case "accounting":
        return <AccountingTab />;
      case "banking":
        return <BankingTab />;
      case "hr":
        return <HrTab />;
      case "employees":
        return <EmployeeTab />;
      case "tasks":
        return <TasksTab />;
      case "chat":
        return <ChatTab />;
      case "warehouses":
        return <InventoryControlTab />;
      case "audit":
        return <AuditTab />;
      case "products":
        return <ProductsTab />;
      case "customers":
        return <CustomersTab />;
      case "vendors":
        return <VendorsTab />;
      case "settings":
        return <TaxesTab />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#070b13] text-slate-100 font-sans overflow-x-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-white/5 bg-slate-950/40 backdrop-blur-xl shrink-0 p-5 flex flex-col gap-8 justify-between">
        <div className="flex flex-col gap-8">
          
          {/* Logo Header */}
          <div className="flex items-center gap-2 px-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="font-extrabold text-sm font-display text-white">F</span>
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider font-display bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                FlowOS
              </span>
              <span className="text-[10px] text-indigo-400 font-bold block tracking-wider uppercase font-display">
                ERP Cloud
              </span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="flex flex-col gap-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group font-display text-sm font-medium ${
                    isActive
                      ? "bg-brand-600/10 border border-brand-500/25 text-brand-300 shadow-md shadow-brand-500/5"
                      : "text-slate-400 border border-transparent hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4.5 w-4.5 transition-colors ${isActive ? "text-brand-400" : "text-slate-400 group-hover:text-white"}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-brand-400" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer profile */}
        <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-slate-300">
              <User className="h-5 w-5" />
            </div>
            <div className="truncate">
              <p className="text-xs text-slate-200 font-bold truncate">{user?.email || "Admin Account"}</p>
              <p className="text-[10px] text-slate-500 font-semibold truncate">{user?.role || "company_admin"}</p>
            </div>
          </div>
          <button
            onClick={() => dispatch(clearCredentials())}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all text-xs font-semibold cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {renderActiveTab()}
      </main>
    </div>
  );
}

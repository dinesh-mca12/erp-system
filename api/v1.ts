import { configureCors, login, register, sendJson } from "./_lib/auth.js";

const records = new Map<string, Array<Record<string, any>>>();
let seeded = false;

const base = (id: string, status = "active") => ({
  id,
  companyId: "comp_abc123",
  branchId: "branch_1",
  createdAt: new Date().toISOString(),
  createdBy: "mock-user-comp_abc123",
  updatedAt: new Date().toISOString(),
  updatedBy: "mock-user-comp_abc123",
  isDeleted: false,
  status,
});

const seedDemoData = (): void => {
  if (seeded) return;
  seeded = true;
  records.set("customers", [{
    ...base("cust_apex_labs"),
    name: "Apex Labs India",
    email: "billing@apexlabs.example",
    phone: "+91 9876543210",
    billingAddress: { city: "Bengaluru", state: "Karnataka", country: "India" },
    shippingAddress: { city: "Bengaluru", state: "Karnataka", country: "India" },
    creditLimit: 250000,
    outstandingBalance: 48000,
    currencyCode: "INR",
  }]);
  records.set("vendors", [{
    ...base("vend_steel_corp"),
    name: "Steel Corp India",
    email: "accounts@steelcorp.example",
    phone: "+91 9988776655",
    address: { city: "Mumbai", state: "Maharashtra", country: "India" },
    rating: 4.5,
    leadTimeDays: 7,
    outstandingBalance: 18500,
    currencyCode: "INR",
  }]);
  records.set("products", [{
    ...base("prod_steel_bar"),
    sku: "STL-001",
    hsn: "7214",
    name: "Steel Bar - Alloy 40",
    type: "product",
    categoryId: "cat_raw_materials",
    brandId: "brand_flowos",
    unitId: "unit_piece",
    sellingPrice: 180,
    purchasePrice: 120,
    taxRate: 18,
    openingStock: 500,
    minStock: 100,
    maxStock: 1000,
    batchTracked: true,
    serialTracked: false,
    expiryTracked: false,
    images: [],
  }]);
  records.set("products/categories", [{ ...base("cat_raw_materials"), name: "Raw Materials", description: "Production inputs" }]);
  records.set("products/brands", [{ ...base("brand_flowos"), name: "FlowOS", description: "Demo brand" }]);
  records.set("products/units", [{ ...base("unit_piece"), name: "Piece", code: "PCS" }]);
  records.set("products/warehouses", [{ ...base("wh_main"), name: "Main Warehouse", code: "WH-BOM", location: "Mumbai", isDefault: true }]);
  records.set("inventory/warehouses", records.get("products/warehouses")!);
  records.set("employees", [{
    ...base("emp_amit"),
    firstName: "Amit",
    lastName: "Sharma",
    email: "amit.sharma@example.com",
    phone: "+91 9000000001",
    departmentId: "dept_finance",
    designation: "Finance Manager",
    joiningDate: "2024-01-15",
    monthlyBaseSalary: 85000,
  }]);
  records.set("employees/departments", [{ ...base("dept_finance"), name: "Finance", description: "Finance and accounting" }]);
  records.set("tasks", [{
    ...base("task_reconcile"),
    title: "Reconcile monthly bank statement",
    description: "Review and reconcile the latest statement.",
    priority: "high",
    department: "Accounting",
    assignedTo: "emp_amit",
    dueDate: "2026-11-15",
    estimatedHours: 4,
    progress: 35,
    status: "in_progress",
  }]);
  records.set("sales/invoices", [{
    ...base("inv_1024", "overdue"),
    invoiceNumber: "INV-2026-0024",
    customerId: "cust_apex_labs",
    items: [{ productId: "prod_steel_bar", description: "Steel Bar - Alloy 40", quantity: 100, unitPrice: 180, taxRate: 18, lineTotal: 18000 }],
    subTotal: 18000,
    taxAmount: 3240,
    discount: 0,
    grandTotal: 21240,
    amountPaid: 0,
    amountDue: 21240,
    currencyCode: "INR",
    exchangeRate: 1,
    baseCurrencyAmount: 21240,
    gstDetails: { gstin: "", cgst: 1620, sgst: 1620, igst: 0 },
    dueDate: "2026-10-15",
  }]);
  records.set("sales/orders", [{ ...base("so_1001"), orderNumber: "SO-2026-0101", customerId: "cust_apex_labs", grandTotal: 21240, status: "confirmed", items: [] }]);
  records.set("purchase/orders", [{ ...base("po_1001"), orderNumber: "PO-2026-0042", vendorId: "vend_steel_corp", grandTotal: 60000, status: "approved", items: [] }]);
  records.set("purchase/bills", [{ ...base("bill_1001", "open"), billNumber: "BILL-2026-0042", vendorId: "vend_steel_corp", grandTotal: 60000, amountDue: 18500, items: [] }]);
  records.set("projects", [{ ...base("proj_erp"), customerId: "cust_apex_labs", name: "ERP implementation", budgetHours: 240, budgetAmount: 450000, billingType: "time_and_material" }]);
  records.set("accounting/accounts", [{ ...base("acc_cash"), accountName: "Cash and Bank", accountType: "asset", balance: 1450000 }, { ...base("acc_sales"), accountName: "Sales Revenue", accountType: "income", balance: 1420000 }]);
  records.set("banking/accounts", [{ ...base("bank_hdfc"), accountName: "HDFC Current Account", bankName: "HDFC Bank", accountNumber: "XXXX0012", balance: 1450000 }]);
  records.set("banking/transactions", [{ ...base("txn_1001"), amount: 118000, type: "credit", description: "Customer payment - Apex Labs", transactionDate: "2026-11-01" }]);
  records.set("hr/employees", records.get("employees")!);
  records.set("hr/payslips", [{ ...base("pay_amit"), employeeId: "emp_amit", month: "October 2026", baseSalary: 85000, allowances: 10000, deductions: 8500, netSalary: 86500, status: "processed" }]);
  records.set("projects/timesheets", [{ ...base("time_1001"), projectId: "proj_erp", userId: "emp_amit", date: "2026-11-04", hours: 4, billable: true, invoiced: false }]);
  records.set("communication/channels", [{ ...base("channel_general"), name: "General", description: "Company-wide discussion", memberCount: 6 }]);
  records.set("dashboard/activities", [{ ...base("act_1"), userName: "Amit Sharma", module: "sales", action: "create", description: "Created Invoice INV-2026-0024" }]);
};

const getPath = (req: any): string => {
  const value = req.query?.path;
  return Array.isArray(value) ? value.join("/") : String(value || "");
};

const sendList = (res: any): void => {
  sendJson(res, 200, { success: true, data: [], meta: null, error: null });
};

const getPayload = (req: any): Record<string, any> =>
  req.body && typeof req.body === "object" ? req.body : {};

const getCollection = (path: string): Array<Record<string, any>> => {
  const collection = records.get(path);
  if (collection) {
    return collection;
  }
  const created: Array<Record<string, any>> = [];
  records.set(path, created);
  return created;
};

export default function handler(req: any, res: any): void {
  configureCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const path = getPath(req);
  seedDemoData();

  if (path === "auth/login" && req.method === "POST") {
    login(req, res);
    return;
  }
  if (path === "auth/register-company" && req.method === "POST") {
    register(req, res);
    return;
  }
  if (path === "dashboard/summary" && req.method === "GET") {
    sendJson(res, 200, {
      success: true,
      data: {
        summary: {
          companyId: "comp_abc123",
          cashPosition: 1450000,
          overdueReceivables: { count: 3, amount: 48000 },
          overduePayables: { count: 2, amount: 18500 },
          pendingApprovals: 5,
          lowStockCount: 4,
          healthScore: 78,
          healthScoreFactors: [
            { factor: "Receivables Aging", impact: "negative", detail: "3 invoices overdue by more than 30 days." },
            { factor: "Revenue Velocity", impact: "positive", detail: "Sales orders rose 12% over the last week." },
            { factor: "Operating Runway", impact: "positive", detail: "Cash reserves are sufficient for 8 months of operations." },
          ],
          updatedAt: new Date().toISOString(),
        },
        suggestions: [],
        activities: [],
      },
      meta: null,
      error: null,
    });
    return;
  }
  if (path === "analytics/runway" && req.method === "GET") {
    sendJson(res, 200, {
      success: true,
      data: { runwayMonths: 8, currentCash: 1450000, monthlyBurn: 181250, averageMonthlyBurn: 181250, riskLevel: "low", alerts: [] },
      error: null,
    });
    return;
  }

  if (path.startsWith("dashboard/suggestions/") && req.method === "POST") {
    sendJson(res, 200, { success: true, data: { processed: true }, error: null });
    return;
  }

  const pathParts = path.split("/").filter(Boolean);
  const collectionRoutes = new Set([
    "sales/invoices",
    "sales/credit-notes",
    "sales/retainers",
    "sales/orders",
    "purchase/bills",
    "purchase/orders",
    "projects/timesheets",
    "accounting/accounts",
    "accounting/journals",
    "accounting/assets",
    "banking/accounts",
    "banking/transactions",
    "hr/payslips",
    "hr/employees",
    "communication/channels",
    "dashboard/activities",
    "products/categories",
    "products/units",
    "products/brands",
    "products/warehouses",
    "products/taxes",
    "inventory/warehouses",
    "employees/departments",
  ]);
  const isCollectionRoute = collectionRoutes.has(path);
  const recordCollections = new Set(["customers", "vendors", "products", "tasks", "employees"]);
  const hasRecordId = pathParts.length > 1 &&
    recordCollections.has(pathParts[0]) &&
    !isCollectionRoute &&
    /^[a-z0-9_-]+$/.test(pathParts[pathParts.length - 1]);
  const collectionPath = hasRecordId
    ? pathParts.slice(0, -1).join("/")
    : path;
  const recordId = hasRecordId ? pathParts[pathParts.length - 1] : null;
  const collection = getCollection(collectionPath);

  if (req.method === "GET") {
    if (recordId) {
      const record = collection.find((item) => item.id === recordId);
      sendJson(res, record ? 200 : 404, record
        ? { success: true, data: record, error: null }
        : { success: false, data: null, error: { code: "NOT_FOUND", message: "Record not found." } });
      return;
    }
    sendJson(res, 200, { success: true, data: collection, meta: null, error: null });
    return;
  }

  if (req.method === "POST") {
    const payload = getPayload(req);
    const record = { ...payload, id: payload.id || `${collectionPath.replace(/\//g, "_")}_${Date.now()}` };
    collection.push(record);
    sendJson(res, 201, { success: true, data: record, meta: null, error: null });
    return;
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    if (!recordId) {
      sendJson(res, 400, { success: false, data: null, error: { code: "BAD_REQUEST", message: "Record ID is required." } });
      return;
    }
    const index = collection.findIndex((item) => item.id === recordId);
    const updated = { ...(index >= 0 ? collection[index] : {}), ...getPayload(req), id: recordId };
    if (index >= 0) collection[index] = updated;
    else collection.push(updated);
    sendJson(res, 200, { success: true, data: updated, error: null });
    return;
  }

  if (req.method === "DELETE") {
    const remaining = collection.filter((item) => item.id !== recordId);
    records.set(collectionPath, remaining);
    sendJson(res, 200, { success: true, data: { id: recordId }, error: null });
    return;
  }

  if (req.method === "GET") {
    sendList(res);
    return;
  }

  sendJson(res, 200, { success: true, data: {}, meta: null, error: null });
}

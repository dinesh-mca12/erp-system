import { configureCors, login, register, sendJson } from "./_lib/auth.js";

const records = new Map<string, Array<Record<string, any>>>();

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
  const collectionPath = pathParts.length > 1 && !isCollectionRoute && /^[a-z0-9-]+$/.test(pathParts[pathParts.length - 1])
    ? pathParts.slice(0, -1).join("/")
    : path;
  const recordId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;
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

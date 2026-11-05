import { configureCors, sendJson } from "../_lib/auth.js";

const summary = (companyId: string) => ({
  companyId,
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
});

const suggestions = [
  {
    id: "sug_1",
    type: "draft_purchase_order",
    targetModule: "purchase",
    proposedPayload: { vendorName: "Steel Corp India", items: [{ productId: "prod_steel_bar", quantity: 500, price: 120 }], total: 60000 },
    confidenceScore: 0.94,
    reviewStatus: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sug_2",
    type: "draft_reminder",
    targetModule: "sales",
    proposedPayload: { invoiceNumber: "INV-2026-0024", customerName: "Apex Labs Pvt Ltd", amountOverdue: 15400, daysOverdue: 12 },
    confidenceScore: 0.88,
    reviewStatus: "pending",
    createdAt: new Date().toISOString(),
  },
];

const activities = [
  {
    id: "act_1",
    userName: "Amit Sharma",
    module: "sales",
    action: "create",
    description: "Created Invoice INV-2026-0028 for Rs. 1,18,000",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "act_2",
    userName: "Neha Gupta",
    module: "banking",
    action: "approve",
    description: "Approved payment voucher for Vendor Logistics Hub",
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
];

export default function handler(req: any, res: any): void {
  configureCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const path = (req.url || "").split("?")[0];
  const companyId = "comp_abc123";

  if (req.method === "GET" && path.endsWith("/dashboard/summary")) {
    sendJson(res, 200, {
      success: true,
      data: { summary: summary(companyId), suggestions, activities },
      meta: null,
      error: null,
    });
    return;
  }

  if (req.method === "GET" && path.endsWith("/analytics/runway")) {
    sendJson(res, 200, {
      success: true,
      data: {
        runwayMonths: 8,
        currentCash: 1450000,
        monthlyBurn: 181250,
        riskLevel: "low",
      },
      error: null,
    });
    return;
  }

  if (req.method === "POST" && path.includes("/dashboard/suggestions/")) {
    sendJson(res, 200, { success: true, data: { processed: true }, error: null });
    return;
  }

  if (req.method === "GET") {
    sendJson(res, 200, { success: true, data: [], meta: null, error: null });
    return;
  }

  sendJson(res, 405, {
    success: false,
    data: null,
    error: { code: "METHOD_NOT_ALLOWED", message: "Method is not supported for this endpoint." },
  });
}

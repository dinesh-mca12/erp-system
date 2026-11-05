import { configureCors, login, register, sendJson } from "./_lib/auth.js";

const getPath = (req: any): string => {
  const value = req.query?.path;
  return Array.isArray(value) ? value.join("/") : String(value || "");
};

const sendList = (res: any): void => {
  sendJson(res, 200, { success: true, data: [], meta: null, error: null });
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

  if (req.method === "GET") {
    sendList(res);
    return;
  }

  sendJson(res, 200, { success: true, data: {}, meta: null, error: null });
}

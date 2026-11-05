import { configureCors, sendJson } from "../../_lib/auth.js";

export default function handler(req: any, res: any): void {
  configureCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "GET") {
    sendJson(res, 405, { success: false, data: null, error: { code: "METHOD_NOT_ALLOWED", message: "GET is required." } });
    return;
  }

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
}

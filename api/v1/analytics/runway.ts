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
      runwayMonths: 8,
      currentCash: 1450000,
      monthlyBurn: 181250,
      averageMonthlyBurn: 181250,
      riskLevel: "low",
      alerts: [],
    },
    error: null,
  });
}

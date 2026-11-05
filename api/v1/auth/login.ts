import { configureCors, login, sendJson } from "../../_lib/auth.js";

export default function handler(req: any, res: any): void {
  configureCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { success: false, data: null, error: { code: "METHOD_NOT_ALLOWED", message: "POST is required." } });
    return;
  }
  login(req, res);
}

import { configureCors, sendJson } from "./auth.js";

export default function listHandler(req: any, res: any): void {
  configureCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method === "GET") {
    sendJson(res, 200, { success: true, data: [], meta: null, error: null });
    return;
  }
  sendJson(res, 200, { success: true, data: {}, meta: null, error: null });
}

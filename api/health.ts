import { configureCors, sendJson } from "./_lib/auth.js";

export default function handler(req: any, res: any): void {
  configureCors(req, res);
  sendJson(res, 200, { status: "healthy", timestamp: new Date().toISOString() });
}

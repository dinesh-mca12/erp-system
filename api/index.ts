type DemoUser = {
  companyId: string;
  branchId: string;
  email: string;
  role: string;
  password: string;
};

const users = new Map<string, DemoUser>([
  [
    "admin@flowos.com",
    {
      companyId: "comp_abc123",
      branchId: "branch_1",
      email: "admin@flowos.com",
      role: "company_admin",
      password: "adminpassword",
    },
  ],
]);

const sendJson = (res: any, status: number, body: object): void => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const getBody = (req: any): Record<string, string> => {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  return {};
};

export default function handler(req: any, res: any): void {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const path = (req.url || "").split("?")[0];

  if (req.method === "GET" && (path === "/api/health" || path === "/health")) {
    sendJson(res, 200, { status: "healthy", timestamp: new Date().toISOString() });
    return;
  }

  if (req.method === "POST" && path.endsWith("/auth/login")) {
    const { email, password } = getBody(req);
    const user = users.get(email);

    if (!user || user.password !== password) {
      sendJson(res, 401, {
        success: false,
        data: null,
        error: { code: "UNAUTHORIZED", message: "Invalid email or password." },
      });
      return;
    }

    sendJson(res, 200, {
      success: true,
      data: {
        user: {
          uid: `mock-user-${user.companyId}`,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          branchIds: [user.branchId],
        },
        token: `mock_${user.role}_${user.companyId}`,
      },
      meta: { message: "Successfully authenticated." },
      error: null,
    });
    return;
  }

  if (req.method === "POST" && path.endsWith("/auth/register-company")) {
    const { companyName, email, password } = getBody(req);
    if (!companyName || !email || !password) {
      sendJson(res, 400, {
        success: false,
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Company, email, and password are required." },
      });
      return;
    }

    const companyId = `comp_${Math.random().toString(36).slice(2, 10)}`;
    const branchId = `branch_${Math.random().toString(36).slice(2, 10)}`;
    users.set(email, { companyId, branchId, email, role: "company_admin", password });

    sendJson(res, 201, {
      success: true,
      data: { companyId, branchId, role: "company_admin" },
      meta: { message: "Company registered successfully." },
      error: null,
    });
    return;
  }

  sendJson(res, 404, {
    success: false,
    data: null,
    error: { code: "NOT_FOUND", message: "API route not found." },
  });
}

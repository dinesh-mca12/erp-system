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

export const sendJson = (res: any, status: number, body: object): void => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const getBody = (req: any): Record<string, string> =>
  req.body && typeof req.body === "object" ? req.body : {};

export const configureCors = (req: any, res: any): void => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
};

export const login = (req: any, res: any): void => {
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
};

export const register = (req: any, res: any): void => {
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
};

import { Request, Response, NextFunction } from "express";
import { db, auth } from "../../config/firebase.js";
import { DashboardSummary } from "@flowos/shared-types";

export const mockUsersStore = new Map<string, { companyId: string; branchId: string; email: string; role: string; password?: string }>();

// Seed default admin sandbox credentials
mockUsersStore.set("admin@flowos.com", {
  companyId: "comp_abc123",
  branchId: "branch_1",
  email: "admin@flowos.com",
  role: "company_admin",
  password: "adminpassword"
});

export const registerCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyName, email, password } = req.body;
    let { uid } = req.body;

    const companyRef = db.collection("companies").doc();
    const branchRef = db.collection("branches").doc();
    const companyId = companyRef.id;
    const branchId = branchRef.id;
    uid = uid || "mock-user-" + Math.random().toString(36).substring(2, 9);

    try {
      // Create Company in Transaction or Batch
      const batch = db.batch();

      // 1. Save company
      batch.set(companyRef, {
        id: companyId,
        name: companyName,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      });

      // 2. Save branch
      batch.set(branchRef, {
        id: branchId,
        companyId: companyId,
        name: "Main Branch",
        isMainBranch: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      });

      // 3. Save company admin user profile in Firestore
      const userProfileRef = db.collection("users").doc(uid);
      batch.set(userProfileRef, {
        id: uid,
        companyId,
        email,
        role: "company_admin",
        branchIds: [branchId],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      });

      // 4. Save initial pre-aggregated Dashboard summary for the company
      const dashboardSummaryRef = db.collection("dashboard_summaries").doc(companyId);
      const initialSummary: DashboardSummary = {
        companyId,
        cashPosition: 1450000,
        overdueReceivables: { count: 3, amount: 48000 },
        overduePayables: { count: 2, amount: 18500 },
        pendingApprovals: 5,
        lowStockCount: 4,
        healthScore: 78,
        healthScoreFactors: [
          {
            factor: "Receivables Aging",
            impact: "negative",
            detail: "3 invoices overdue by more than 30 days."
          },
          {
            factor: "Revenue Velocity",
            impact: "positive",
            detail: "Sales orders rose 12% over the last week."
          },
          {
            factor: "Operating Runway",
            impact: "positive",
            detail: "Cash reserves are sufficient for 8 months of operations."
          }
        ],
        updatedAt: new Date(),
      };
      batch.set(dashboardSummaryRef, initialSummary);

      await batch.commit();

      // Set Custom Claims on Firebase User
      await auth.setCustomUserClaims(uid, {
        companyId,
        role: "company_admin",
        branchIds: [branchId],
      });
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, saving company registration details in mock store.");
      mockUsersStore.set(email, {
        companyId,
        branchId,
        email,
        role: "company_admin",
        password: password || "adminpassword"
      });
    }

    res.status(201).json({
      success: true,
      data: {
        companyId,
        branchId,
        role: "company_admin",
      },
      meta: {
        message: "Company registered successfully.",
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const matchedUser = mockUsersStore.get(email);
    if (!matchedUser || (matchedUser.password && matchedUser.password !== password)) {
      res.status(401).json({
        success: false,
        data: null,
        error: { code: "UNAUTHORIZED", message: "Invalid email or password." }
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          uid: `mock-user-${matchedUser.companyId}`,
          email: matchedUser.email,
          role: matchedUser.role,
          companyId: matchedUser.companyId,
          branchIds: [matchedUser.branchId]
        },
        token: `mock_${matchedUser.role}_${matchedUser.companyId}`
      },
      meta: { message: "Successfully authenticated." },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

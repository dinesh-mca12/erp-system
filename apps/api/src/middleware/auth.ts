import { Request, Response, NextFunction } from "express";
import { auth } from "../config/firebase.js";
import { CustomClaims } from "@flowos/shared-types";

// Extend Express Request interface to include custom user properties
declare global {
  namespace Express {
    interface Request {
      user?: CustomClaims & {
        uid: string;
        email?: string;
      };
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "Authorization header with Bearer token is required.",
      },
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  // Helper/Mock workflow for simple developer testing (e.g. Bearer mock_company_admin_comp_abc123)
  if ((process.env.FIRESTORE_EMULATOR_HOST || process.env.NODE_ENV !== "production") && token.startsWith("mock_")) {
    const parts = token.substring(5).split("_"); // e.g. ["company", "admin", "comp", "abc123"]
    let role = "company_admin";
    let companyId = "comp_abc123";
    
    if (parts.length >= 2) {
      role = `${parts[0]}_${parts[1]}`;
    }
    if (parts.length >= 4) {
      companyId = `${parts[2]}_${parts[3]}`;
    }
    
    req.user = {
      uid: `mock-user-${companyId}`,
      email: `${role}@${companyId}.com`,
      companyId: companyId,
      role: role,
      branchIds: [`branch_${companyId}`],
    };
    next();
    return;
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    
    // Resolve custom claims from JWT token
    const companyId = decodedToken.companyId as string;
    const role = decodedToken.role as string;
    const branchIds = (decodedToken.branchIds as string[]) || [];

    if (!companyId || !role) {
      res.status(403).json({
        success: false,
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Custom claims (companyId, role) are missing from the authentication token.",
        },
      });
      return;
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      companyId,
      role,
      branchIds,
    };
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired token.",
        details: error.message,
      },
    });
  }
};

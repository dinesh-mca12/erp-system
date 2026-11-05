import { Request, Response, NextFunction } from "express";
import { ROLE_PERMISSIONS, AppModule, PermissionAction, UserRole } from "@flowos/shared-constants";

export const requirePermission = (module: AppModule, action: PermissionAction) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication context is missing.",
        },
      });
      return;
    }

    const { role } = req.user;

    // Check if the role is valid and has permissions configured
    const userRole = role as UserRole;
    const permissionsForRole = ROLE_PERMISSIONS[userRole];

    if (!permissionsForRole) {
      res.status(403).json({
        success: false,
        data: null,
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Role '${role}' has no permissions defined.`,
        },
      });
      return;
    }

    // Check if company_admin (which bypasses checks for all module actions except super-admin collections)
    if (userRole === "company_admin") {
      next();
      return;
    }

    // Check if role has access to module and action
    const allowedActions = permissionsForRole[module];
    if (allowedActions && allowedActions.includes(action)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      data: null,
      error: {
        code: "FORBIDDEN",
        message: `Access denied. Role '${role}' does not have permission to perform '${action}' on '${module}'.`,
      },
    });
  };
};

import { Request, Response, NextFunction } from "express";
import { AppModule, PermissionAction } from "@flowos/shared-constants";
export declare const requirePermission: (module: AppModule, action: PermissionAction) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=rbac.d.ts.map
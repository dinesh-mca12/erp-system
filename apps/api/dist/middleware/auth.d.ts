import { Request, Response, NextFunction } from "express";
import { CustomClaims } from "@flowos/shared-types";
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
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map
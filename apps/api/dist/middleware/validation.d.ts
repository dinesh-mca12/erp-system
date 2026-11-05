import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
export declare const validateSchema: (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=validation.d.ts.map
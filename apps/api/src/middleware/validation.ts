import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export const validateSchema = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fields: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          fields[path] = err.message;
        });

        res.status(400).json({
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: error.errors[0]?.message || "Validation failed",
            fields,
          },
        });
        return;
      }
      next(error);
    }
  };
};

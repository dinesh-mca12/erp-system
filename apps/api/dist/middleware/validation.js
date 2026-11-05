import { ZodError } from "zod";
export const validateSchema = (schema) => {
    return async (req, res, next) => {
        try {
            req.body = await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                const fields = {};
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
//# sourceMappingURL=validation.js.map
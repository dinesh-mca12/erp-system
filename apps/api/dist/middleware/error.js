export const errorHandler = (err, req, res, next) => {
    console.error("[Error Handler]", err);
    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({
        success: false,
        data: null,
        error: {
            code: err.code || "INTERNAL_SERVER_ERROR",
            message: err.message || "An unexpected error occurred.",
            details: process.env.NODE_ENV !== "production" ? err.stack : undefined,
        },
    });
};
//# sourceMappingURL=error.js.map
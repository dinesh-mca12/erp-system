import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/error.js";
// Routes
import authRouter from "./modules/auth/auth.routes.js";
import companyRouter from "./modules/company/company.routes.js";
import dashboardRouter from "./modules/dashboard/dashboard.routes.js";
import customerRouter from "./modules/customer/customer.routes.js";
import vendorRouter from "./modules/vendor/vendor.routes.js";
import productRouter from "./modules/product/product.routes.js";
import salesRouter from "./modules/sales/sales.routes.js";
import purchaseRouter from "./modules/purchase/purchase.routes.js";
import projectsRouter from "./modules/projects/projects.routes.js";
import accountingRouter from "./modules/accounting/accounting.routes.js";
import bankingRouter from "./modules/banking/banking.routes.js";
import hrRouter from "./modules/hr/hr.routes.js";
import inventoryRouter from "./modules/inventory/inventory.routes.js";
import analyticsRouter from "./modules/analytics/analytics.routes.js";
import employeesRouter from "./modules/employees/employees.routes.js";
import tasksRouter from "./modules/tasks/tasks.routes.js";
import communicationRouter from "./modules/communication/communication.routes.js";
dotenv.config();
const app = express();
const port = process.env.PORT || 5000;
// Enable verified CORS origins and JSON parsing
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5002",
    "http://localhost:3000",
    "http://localhost:5174"
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("CORS policy violation: request origin not permitted."));
        }
    },
    credentials: true,
}));
app.use(express.json());
// Request logging middleware
app.use(requestLogger);
// Mount API routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/company", companyRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/customers", customerRouter);
app.use("/api/v1/vendors", vendorRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/sales", salesRouter);
app.use("/api/v1/purchase", purchaseRouter);
app.use("/api/v1/projects", projectsRouter);
app.use("/api/v1/accounting", accountingRouter);
app.use("/api/v1/banking", bankingRouter);
app.use("/api/v1/hr", hrRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.use("/api/v1/employees", employeesRouter);
app.use("/api/v1/tasks", tasksRouter);
app.use("/api/v1/communication", communicationRouter);
// Base test endpoint
app.get("/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date() });
});
// Centralized error handling middleware
app.use(errorHandler);
// Start server
app.listen(port, () => {
    console.log(`[FlowOS API] Server is running on port ${port}`);
});
export default app;
//# sourceMappingURL=server.js.map
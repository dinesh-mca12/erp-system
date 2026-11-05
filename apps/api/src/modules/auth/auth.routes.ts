import { Router } from "express";
import { registerCompany, loginUser } from "./auth.controller.js";
import { validateSchema } from "../../middleware/validation.js";
import { registerCompanySchema } from "./auth.validation.js";

const router = Router();

// POST /api/v1/auth/register-company
router.post("/register-company", validateSchema(registerCompanySchema), registerCompany);

// POST /api/v1/auth/login
router.post("/login", loginUser);

export default router;

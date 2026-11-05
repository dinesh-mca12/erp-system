import { auth } from "../config/firebase.js";
export const authenticate = async (req, res, next) => {
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
    if (process.env.FIRESTORE_EMULATOR_HOST && token.startsWith("mock_")) {
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
        const companyId = decodedToken.companyId;
        const role = decodedToken.role;
        const branchIds = decodedToken.branchIds || [];
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
    }
    catch (error) {
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
//# sourceMappingURL=auth.js.map
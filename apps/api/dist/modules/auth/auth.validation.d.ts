import { z } from "zod";
export declare const registerCompanySchema: z.ZodObject<{
    companyName: z.ZodString;
    email: z.ZodString;
    uid: z.ZodString;
}, "strip", z.ZodTypeAny, {
    companyName: string;
    email: string;
    uid: string;
}, {
    companyName: string;
    email: string;
    uid: string;
}>;
//# sourceMappingURL=auth.validation.d.ts.map
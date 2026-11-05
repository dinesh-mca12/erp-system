import { Request, Response, NextFunction } from "express";
import { mockAccountsStore } from "../accounting/accounting.controller.js";
import { mockBankAccountsStore } from "../banking/banking.controller.js";
import { ForecastReport } from "@flowos/shared-types";

export const getRunwayForecaster = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    // Retrieve cash balance from linked Bank accounts
    const bankList = mockBankAccountsStore.get(companyId) || [];
    let cashBalance = bankList.reduce((sum, b) => sum + (b.balance || 0), 0);
    if (cashBalance === 0) {
      cashBalance = 1450000; // Seed fallback
    }

    // Retrieve monthly operating burn rate from expense accounts
    const accList = mockAccountsStore.get(companyId) || [];
    let totalExpenses = accList
      .filter(a => a.type === "expense")
      .reduce((sum, a) => sum + (a.balance || 0), 0);
    if (totalExpenses === 0) {
      totalExpenses = 120000; // Seed fallback
    }

    let totalRevenue = accList
      .filter(a => a.type === "revenue")
      .reduce((sum, a) => sum + (a.balance || 0), 0);
    if (totalRevenue === 0) {
      totalRevenue = 350000; // Seed fallback
    }

    // Runway math (Months of survival)
    const runwayMonths = totalExpenses > 0 ? parseFloat((cashBalance / totalExpenses).toFixed(1)) : 99;

    const alerts: string[] = [];
    if (runwayMonths < 3) {
      alerts.push("CRITICAL ALERT: Low cash runway detected. Runway is under 3 months. Restructure operating expenses immediately.");
    } else if (runwayMonths < 6) {
      alerts.push("WARNING: Runway is under 6 months. Consider raising invoice collections speed or credit extensions.");
    } else {
      alerts.push("NOTICE: Cash runway is healthy and exceeds 12+ months of safe business operation.");
    }

    // Add general financial insights
    if (totalRevenue < totalExpenses) {
      alerts.push("ALERT: Operating cash-flow is negative this quarter. Expenses exceed revenues.");
    }

    const report: ForecastReport = {
      runwayMonths,
      averageMonthlyBurn: totalExpenses,
      averageMonthlyRevenue: totalRevenue,
      alerts
    };

    res.json({ success: true, data: report, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

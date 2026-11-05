import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";

export interface DashboardData {
  summary: {
    companyId: string;
    cashPosition: number;
    overdueReceivables: { count: number; amount: number };
    overduePayables: { count: number; amount: number };
    pendingApprovals: number;
    lowStockCount: number;
    healthScore: number;
    healthScoreFactors: { factor: string; impact: "positive" | "negative"; detail: string }[];
    updatedAt: string;
  };
  suggestions: {
    id: string;
    type: "draft_purchase_order" | "draft_reminder" | "anomaly_flag" | "reconciliation";
    targetModule: string;
    proposedPayload: any;
    confidenceScore: number;
    reviewStatus: string;
    createdAt: string;
  }[];
  activities: {
    id: string;
    userName: string;
    module: string;
    action: string;
    description: string;
    createdAt: string;
  }[];
}

export const useDashboardData = () => {
  const token = useAppSelector((state) => state.auth.token);

  return useQuery<DashboardData>({
    queryKey: ["dashboardSummary", token],
    queryFn: async () => {
      const response = await fetch("/api/v1/dashboard/summary", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to load dashboard statistics.");
      }
      const json = await response.json();
      return json.data;
    },
    enabled: !!token,
    refetchInterval: 60000, // Refresh summary status every minute
  });
};

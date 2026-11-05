// User Roles
export type UserRole =
  | "super_admin"
  | "company_admin"
  | "manager"
  | "accounts"
  | "sales"
  | "purchase"
  | "warehouse"
  | "hr"
  | "employee"
  | "portal_customer"
  | "portal_vendor";

// Action Types for Permission Matrix
export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "export"
  | "print"
  | "share";

// Modules enum/types
export type AppModule =
  | "sales"
  | "purchase"
  | "inventory"
  | "accounting"
  | "banking"
  | "projects"
  | "hr"
  | "company"
  | "users"
  | "dashboard"
  | "ai";

// Default permissions matrix mapping
export const ROLE_PERMISSIONS: Record<UserRole, Partial<Record<AppModule, PermissionAction[]>>> = {
  super_admin: {
    company: ["view", "create", "edit", "delete"],
    users: ["view", "create", "edit", "delete"]
  },
  company_admin: {
    sales: ["view", "create", "edit", "delete", "approve", "export", "print", "share"],
    purchase: ["view", "create", "edit", "delete", "approve", "export", "print", "share"],
    inventory: ["view", "create", "edit", "delete", "approve", "export", "print", "share"],
    accounting: ["view", "create", "edit", "delete", "approve", "export", "print", "share"],
    banking: ["view", "create", "edit", "delete", "approve", "export", "print", "share"],
    projects: ["view", "create", "edit", "delete", "approve", "export", "print", "share"],
    hr: ["view", "create", "edit", "delete", "approve", "export", "print", "share"],
    company: ["view", "edit"],
    users: ["view", "create", "edit", "delete"],
    dashboard: ["view"],
    ai: ["view", "create"]
  },
  manager: {
    sales: ["view", "create", "edit", "approve", "export", "print", "share"],
    purchase: ["view", "create", "edit", "approve", "export", "print", "share"],
    inventory: ["view", "create", "edit", "approve"],
    accounting: ["view"],
    banking: ["view"],
    projects: ["view", "create", "edit", "approve"],
    hr: ["view"],
    users: ["view"],
    dashboard: ["view"]
  },
  accounts: {
    accounting: ["view", "create", "edit", "delete", "export", "print", "share"],
    banking: ["view", "create", "edit", "delete", "approve"],
    sales: ["view"],
    purchase: ["view"],
    dashboard: ["view"]
  },
  sales: {
    sales: ["view", "create", "edit", "export", "print", "share"],
    dashboard: ["view"]
  },
  purchase: {
    purchase: ["view", "create", "edit", "export", "print", "share"],
    dashboard: ["view"]
  },
  warehouse: {
    inventory: ["view", "create", "edit", "share"],
    dashboard: ["view"]
  },
  hr: {
    hr: ["view", "create", "edit", "delete", "export", "share"]
  },
  employee: {
    projects: ["view"],
    hr: ["view"] // Self service only (e.g. view personal records)
  },
  portal_customer: {
    sales: ["view", "print", "share"] // strictly limited
  },
  portal_vendor: {
    purchase: ["view", "print", "share"] // strictly limited
  }
};

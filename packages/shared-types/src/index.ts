// Base Types
export type TimestampType = any; // Can represent Firestore Timestamp, Date, or ISO string

export interface BaseDocument {
  id: string;
  companyId: string;
  branchId?: string;
  createdAt: TimestampType;
  createdBy: string; // userId
  updatedAt: TimestampType;
  updatedBy: string; // userId
  isDeleted: boolean; // soft delete
  status?: string; // module-specific status enum
  customFields?: Record<string, string | number | boolean | Date | null>;
}

// Multi-currency (added to every transactional document)
export interface CurrencyFields {
  currencyCode: string; // e.g. "INR", "USD"
  exchangeRate: number; // rate to company base currency at transaction time
  baseCurrencyAmount: number;
}

// Retainer Invoice
export interface RetainerInvoice extends BaseDocument, CurrencyFields {
  customerId: string;
  amount: number;
  amountApplied: number; // portion already adjusted against final invoice
  status: "unapplied" | "partially_applied" | "fully_applied";
}

// Credit Note
export interface CreditNote extends BaseDocument, CurrencyFields {
  customerId: string;
  invoiceId?: string; // originating invoice, if any
  reason: string;
  amount: number;
  action: "refund" | "apply_to_invoice" | "open_credit";
}

// Fixed Asset
export interface FixedAsset extends BaseDocument {
  name: string;
  purchaseDate: TimestampType;
  purchaseValue: number;
  depreciationMethod: "straight_line" | "written_down_value";
  usefulLifeMonths: number;
  currentBookValue: number;
}

// Project & Timesheet
export interface Project extends BaseDocument {
  customerId: string;
  name: string;
  budgetHours?: number;
  budgetAmount?: number;
  billingType: "fixed" | "time_and_material";
}

export interface TimesheetEntry extends BaseDocument {
  projectId: string;
  userId: string;
  date: TimestampType;
  hours: number;
  billable: boolean;
  invoiced: boolean;
}

// AI Suggestion (governs §3.2/§5.3)
export interface AiSuggestion extends BaseDocument {
  type: "draft_purchase_order" | "draft_reminder" | "anomaly_flag" | "reconciliation";
  targetModule: string;
  proposedPayload: Record<string, unknown>;
  confidenceScore: number;
  reviewStatus: "pending" | "approved" | "edited_and_approved" | "dismissed";
  reviewedBy?: string;
}

// Invoice
export interface InvoiceLineItem {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

export interface Invoice extends BaseDocument, CurrencyFields {
  invoiceNumber: string;
  customerId: string;
  salesOrderId?: string;
  items: InvoiceLineItem[];
  subTotal: number;
  taxAmount: number;
  discount: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  status: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";
  gstDetails: { gstin: string; cgst: number; sgst: number; igst: number };
  einvoiceIrn?: string;
  ewayBillNumber?: string;
  dueDate: TimestampType;
  pdfUrl?: string;
}

// Product
export interface Product extends BaseDocument {
  sku: string;
  barcode?: string;
  hsn: string;
  name: string;
  type: "product" | "service" | "digital" | "composite";
  categoryId: string;
  brandId?: string;
  unitId: string;
  sellingPrice: number;
  purchasePrice: number;
  taxRate: number;
  openingStock: number;
  minStock: number;
  maxStock: number;
  variants?: { color?: string; size?: string; weight?: string }[];
  batchTracked: boolean;
  serialTracked: boolean;
  expiryTracked: boolean;
  images: string[];
}

// Dashboard Summary Document
export interface DashboardSummary {
  companyId: string;
  cashPosition: number;
  overdueReceivables: { count: number; amount: number };
  overduePayables: { count: number; amount: number };
  pendingApprovals: number;
  lowStockCount: number;
  healthScore: number;
  healthScoreFactors: { factor: string; impact: "positive" | "negative"; detail: string }[];
  updatedAt: TimestampType;
}

// Approval Workflow Engine configuration model
export interface WorkflowDefinition extends BaseDocument {
  module: string; // "purchase_order" | "expense" | "invoice_discount" etc.
  triggerCondition: string; // e.g. "amount > 50000"
  approverChain: { role: string; order: number }[];
  onReject: "return_to_draft" | "cancel";
}

// Custom JWT Claims context
export interface CustomClaims {
  companyId: string;
  role: string;
  branchIds: string[];
}

// Master Data Types (Phase 2 additions)
export interface Customer extends BaseDocument {
  name: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  billingAddress: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  shippingAddress: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  creditLimit?: number;
  outstandingBalance: number;
  currencyCode?: string;
}

export interface Vendor extends BaseDocument {
  name: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  rating?: number;
  leadTimeDays?: number;
  outstandingBalance: number;
  currencyCode?: string;
}

export interface Warehouse extends BaseDocument {
  name: string;
  code: string;
  location?: string;
  isDefault: boolean;
}

export interface Category extends BaseDocument {
  name: string;
  description?: string;
}

export interface Brand extends BaseDocument {
  name: string;
  description?: string;
}

export interface Unit extends BaseDocument {
  name: string; // e.g. "Box", "Kg"
  abbreviation: string; // e.g. "pcs", "kg"
}

export interface TaxSetting extends BaseDocument {
  name: string; // e.g. "GST 18%"
  rate: number; // e.g. 18
  type: "cgst" | "sgst" | "igst" | "flat" | "group";
  subTaxes?: string[]; // IDs of sub-taxes if it's a tax group
}

// Sales Order Types
export interface SalesOrderLineItem {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

export interface SalesOrder extends BaseDocument, CurrencyFields {
  orderNumber: string;
  customerId: string;
  items: SalesOrderLineItem[];
  subTotal: number;
  taxAmount: number;
  discount: number;
  grandTotal: number;
  status: "draft" | "approved" | "invoiced" | "cancelled";
  deliveryDate?: TimestampType;
}

// Purchase Order Types
export interface PurchaseOrderLineItem {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

export interface PurchaseOrder extends BaseDocument, CurrencyFields {
  orderNumber: string;
  vendorId: string;
  items: PurchaseOrderLineItem[];
  subTotal: number;
  taxAmount: number;
  discount: number;
  grandTotal: number;
  status: "draft" | "approved" | "billed" | "cancelled";
  expectedDeliveryDate?: TimestampType;
}

// Bill (Vendor Invoice) Types
export interface BillLineItem {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

export interface Bill extends BaseDocument, CurrencyFields {
  billNumber: string;
  vendorId: string;
  purchaseOrderId?: string;
  items: BillLineItem[];
  subTotal: number;
  taxAmount: number;
  discount: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  status: "draft" | "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled";
  dueDate: TimestampType;
}

// Chart of Accounts Asset, Liability, Equity, Revenue, Expense
export interface Account extends BaseDocument {
  name: string;
  code: string; // e.g. "1000", "2000"
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  balance: number;
}

// Ledger posting Journal Entry line
export interface JournalEntryLine {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry extends BaseDocument {
  entryNumber: string;
  date: TimestampType;
  lines: JournalEntryLine[];
  description: string;
  status: "draft" | "posted";
}

// Banking records
export interface BankAccount extends BaseDocument {
  accountName: string;
  accountNumber: string;
  bankName: string;
  balance: number;
  currencyCode: string;
}

export interface BankTransaction extends BaseDocument {
  bankAccountId: string;
  date: TimestampType;
  description: string;
  amount: number;
  type: "deposit" | "withdrawal";
  reconciled: boolean;
  matchedTransactionId?: string;
}

// HR employees and salaries
export interface Employee extends BaseDocument {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  designation: string;
  department: string;
  joiningDate: TimestampType;
  monthlyBaseSalary: number;
  bankAccountNumber?: string;

  // Lifecycle & system details
  employeeId?: string;
  profilePhoto?: string;
  emergencyContact?: string;
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  employeeType?: string; // Full-time / Contract
  employmentStatus?: "active" | "inactive" | "suspended";
  reportingManager?: string;
  branch?: string;
  officeLocation?: string;
  shift?: string;
  workMode?: "office" | "remote" | "hybrid";
  loginEmail?: string;
  loginStatus?: "online" | "offline";
  lastLogin?: TimestampType;
  accountStatus?: "active" | "inactive" | "suspended";
  assignedRole?: string;
  assignedPermissions?: string[];
}

export interface Payslip extends BaseDocument {
  employeeId: string;
  month: string; // e.g. "January"
  year: number;  // e.g. 2026
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "draft" | "paid";
}

// Multi-Warehouse Management
export interface StockAdjustment extends BaseDocument {
  warehouseId: string;
  productId: string;
  type: "increment" | "decrement";
  quantity: number;
  reason: string;
}

export interface StockTransfer extends BaseDocument {
  sourceWarehouseId: string;
  targetWarehouseId: string;
  productId: string;
  quantity: number;
}

// AI Analytics Predictions
export interface ForecastReport {
  runwayMonths: number;
  averageMonthlyBurn: number;
  averageMonthlyRevenue: number;
  alerts: string[];
}

export interface Department extends BaseDocument {
  name: string;
  departmentHead?: string; // Employee ID
  employeeCount?: number;
  assignedModules?: string[];
}

export interface Task extends BaseDocument {
  taskId: string; // e.g. T-1001
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  department: string;
  assignedBy: string; // Employee ID or User ID
  assignedTo: string; // Employee ID
  dueDate: string;
  estimatedHours?: number;
  progress: number;
  status: "pending" | "assigned" | "in_progress" | "under_review" | "completed" | "reopened" | "cancelled";
  comments?: { userId: string; userName: string; text: string; createdAt: string }[];
}

export interface Channel extends BaseDocument {
  name: string;
  type: "announcement" | "department" | "team";
  department?: string;
  isPrivate: boolean;
  members: string[];
}

export interface Message extends BaseDocument {
  channelId?: string;
  senderId: string;
  senderName: string;
  text: string;
  receiverId?: string; // For DMs
  reactions?: { [emoji: string]: string[] };
  attachments?: { name: string; url: string; type: string }[];
  isPinned?: boolean;
  isEdited?: boolean;
}

export interface Notification extends BaseDocument {
  userId: string;
  title: string;
  message: string;
  type: "mention" | "message" | "announcement" | "task_assigned" | "task_updated" | "approval_required" | "role_changed" | "password_changed";
  read: boolean;
}



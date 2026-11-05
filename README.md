# Erp

FlowOS is an AI-powered ERP monorepo for finance, sales, purchasing, inventory, HR, projects, banking, and business analytics.

## Workspace

- `apps/api`: Express and Firebase backend
- `apps/web`: React and Vite web application
- `apps/desktop`: Electron desktop application
- `packages/shared-types`: shared TypeScript data models
- `packages/shared-constants`: shared application constants

## Requirements

- Node.js
- pnpm
- Firebase configuration for backend features

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm typecheck
```

Run one application only:

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:desktop
```

## Demo environment

The deployed demo includes seeded records for customers, vendors, products, sales,
purchasing, accounting, banking, HR, projects, tasks, warehouses, and communication.
Use `admin@flowos.com` with password `adminpassword` to sign in. The Vercel demo API
stores CRUD changes in serverless memory, so changes are intended for workflow testing
and may reset when a new serverless instance starts.

## AI Report Request Template

Copy this block whenever you need a report. Keep each answer short. Remove fields that do not apply.

```text
REPORT
name: [short report name]
purpose: [what decision or question should this report answer?]
module: [accounting | sales | purchase | inventory | HR | banking | projects | customers | vendors | dashboard]
period: [start date] to [end date]
audience: [who will read it]

DATA
source: [screen, collection, API, or file]
filters: [company, branch, status, customer, vendor, employee, product, or other filters]
include: [fields, records, or categories to include]
exclude: [fields, records, or categories to exclude]

ANALYSIS
metrics: [for example: total revenue, overdue amount, count, margin, growth]
group_by: [day | week | month | customer | vendor | product | department | status]
calculations: [formulas, comparisons, percentages, or business rules]
comparison: [previous period, budget, target, or none]

OUTPUT
format: [table | summary | chart | CSV | PDF]
columns: [exact columns required]
length: [for example: 5 bullet summary + detailed table]
recommendations: [yes or no; explain required actions if yes]

QUALITY
known_limits: [missing data, assumptions, or exclusions]
acceptance: [how to know the report is correct]
```

## Fast Version

Use this shorter form for routine reports:

```text
Create a [report name] for [module] from [start date] to [end date].
Use [data source] and filter by [filters].
Show [metrics], grouped by [grouping], compared with [comparison].
Return [format] with columns [columns].
Purpose: [decision this supports].
Assume [assumptions]. Flag missing or inconsistent data.
```

## Example

```text
REPORT
name: Monthly overdue receivables
purpose: Identify customers requiring collection follow-up
module: accounting
period: 2026-10-01 to 2026-10-31
audience: Finance manager

DATA
source: invoices and customer records
filters: status is overdue; company is current company
include: invoice number, customer, due date, amount due, days overdue
exclude: cancelled invoices

ANALYSIS
metrics: total overdue amount, invoice count, average days overdue
 group_by: customer
calculations: days overdue = report date - due date
comparison: previous month

OUTPUT
format: summary and table
columns: customer, invoice number, due date, amount due, days overdue, risk
length: 5 bullet summary plus detailed table
recommendations: yes

QUALITY
known_limits: exclude invoices without a due date
acceptance: totals must reconcile with the accounting overdue balance
```

## Instructions for AI

When creating a report from this template:

1. Treat `purpose`, `module`, `period`, and `filters` as mandatory scope.
2. Use only the requested data source and clearly state assumptions.
3. Apply the requested calculations exactly; show formulas when useful.
4. Do not invent missing values. Mark missing, conflicting, or stale data.
5. Return the requested format, columns, grouping, and comparison.
6. Start with a concise answer, then provide supporting details.
7. End with data-quality notes and recommended actions when requested.

Never include passwords, API keys, access tokens, or other secrets in a report request.
# erp-system

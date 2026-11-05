import app from "../server.js";
import { db } from "../config/firebase.js";
// Force database offline mode for instant mock store fallback in test execution
db.collection = () => {
    throw new Error("Force database offline mode for instant mock store fallback");
};
const PORT = 5002;
let server;
async function runTests() {
    console.log("==================================================");
    console.log("   FLOWOS ENTERPRISE SYSTEM FLOW TEST SUITE       ");
    console.log("==================================================");
    // Set development emulator host so the mock auth bearer works
    process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
    const baseUrl = `http://localhost:${PORT}/api/v1`;
    const token = "mock_company_admin";
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
    let assetId = "";
    let payrunId = "";
    let txId = "";
    try {
        // 1. Healthcheck Check
        console.log("\n[TEST 1/8] Verifying API Server Health...");
        const healthRes = await fetch(`http://localhost:${PORT}/health`);
        const health = await healthRes.json();
        if (health.status !== "healthy")
            throw new Error("Health check failed");
        console.log("✓ API Server Health check: PASS");
        // 2. Dashboard Summary Check
        console.log("\n[TEST 2/8] Fetching Dashboard Summary Metrics...");
        const dashRes = await fetch(`${baseUrl}/dashboard/summary`, { headers });
        const dash = await dashRes.json();
        if (!dash.success || !dash.data.summary || !dash.data.summary.healthScore)
            throw new Error("Dashboard summary fetch failed");
        console.log(`✓ Dashboard Summary (Health Score: ${dash.data.summary.healthScore}): PASS`);
        // 3. Fixed Asset Depreciation Cycle
        console.log("\n[TEST 3/8] Simulating Fixed Asset Depreciation Cycle...");
        const assetPayload = {
            name: "Server Rack Alpha",
            purchaseDate: "2026-01-01",
            purchaseValue: 120000,
            depreciationMethod: "straight_line",
            usefulLifeMonths: 12,
            currentBookValue: 120000
        };
        const assetCreateRes = await fetch(`${baseUrl}/accounting/assets`, {
            method: "POST",
            headers,
            body: JSON.stringify(assetPayload)
        });
        const assetJson = await assetCreateRes.json();
        if (!assetJson.success)
            throw new Error("Fixed Asset creation failed: " + JSON.stringify(assetJson.error));
        assetId = assetJson.data.id;
        console.log(`✓ Fixed Asset Registered: ${assetJson.data.name} (ID: ${assetId})`);
        // Run straight-line depreciation
        const deprRes = await fetch(`${baseUrl}/accounting/assets/${assetId}/depreciate`, {
            method: "POST",
            headers
        });
        const deprJson = await deprRes.json();
        if (!deprJson.success)
            throw new Error("Asset depreciation execution failed");
        console.log(`✓ Depreciation Run Completed. New Book Value: ₹${deprJson.data.currentBookValue.toLocaleString()}`);
        // 4. Banking Ledger Reconciliations
        console.log("\n[TEST 4/8] Simulating Bank Vault Ledger Reconciliations...");
        const txRes = await fetch(`${baseUrl}/banking/transactions`, { headers });
        const txJson = await txRes.json();
        if (!txJson.success || txJson.data.length === 0)
            throw new Error("No banking transactions loaded");
        txId = txJson.data[0].id;
        console.log(`✓ Loaded Bank Transaction: ${txJson.data[0].reference} (Amount: ₹${txJson.data[0].amount})`);
        // Match transaction
        const reconcileRes = await fetch(`${baseUrl}/banking/transactions/${txId}/reconcile`, {
            method: "POST",
            headers,
            body: JSON.stringify({ matchedTransactionId: "journal_entry_01" })
        });
        const recJson = await reconcileRes.json();
        if (!recJson.success || !recJson.data.reconciled)
            throw new Error("Transaction reconciliation failed");
        console.log(`✓ Bank transaction marked Reconciled. Matched ID: ${recJson.data.matchedTransactionId}`);
        // 5. HR Payroll Payruns
        console.log("\n[TEST 5/8] Simulating HR Employees & Payslips...");
        const empPayload = {
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@flowos.com",
            designation: "Senior Lead Engineer",
            department: "Software Engineering",
            monthlyBaseSalary: 90000,
            joiningDate: "2026-01-15"
        };
        const empCreateRes = await fetch(`${baseUrl}/hr/employees`, {
            method: "POST",
            headers,
            body: JSON.stringify(empPayload)
        });
        const empJson = await empCreateRes.json();
        if (!empJson.success)
            throw new Error("Employee creation failed: " + JSON.stringify(empJson.error));
        const employeeId = empJson.data.id;
        console.log(`✓ HR Employee Registered: ${empJson.data.firstName} ${empJson.data.lastName} (ID: ${employeeId})`);
        // Generate Payslip
        const payslipPayload = {
            employeeId,
            month: "January",
            year: 2026,
            baseSalary: 90000,
            allowances: 15000,
            deductions: 5000,
            netSalary: 100000,
            status: "draft"
        };
        const payslipCreateRes = await fetch(`${baseUrl}/hr/payslips`, {
            method: "POST",
            headers,
            body: JSON.stringify(payslipPayload)
        });
        const payslipJson = await payslipCreateRes.json();
        if (!payslipJson.success)
            throw new Error("Payslip creation failed: " + JSON.stringify(payslipJson.error));
        console.log(`✓ Employee Payslip Generated: Net Payout ₹${payslipJson.data.netSalary.toLocaleString()}`);
        // 6. Multi-Warehouse Stock Relocations
        console.log("\n[TEST 6/8] Simulating Multi-Warehouse Stock Relocations...");
        const whRes = await fetch(`${baseUrl}/inventory/warehouses`, { headers });
        const whJson = await whRes.json();
        if (!whJson.success || whJson.data.length < 2)
            throw new Error("Insufficient linked warehouses");
        const whMumbai = whJson.data[0].id;
        const whBangalore = whJson.data[1].id;
        console.log(`✓ Linked Warehouses Loaded: Mumbai (${whMumbai}), Bangalore (${whBangalore})`);
        // Adjust Stock Level
        const adjPayload = {
            productId: "prod_composite_kit",
            warehouseId: whMumbai,
            type: "increment",
            quantity: 50,
            reason: "Physical audit re-count"
        };
        const adjRes = await fetch(`${baseUrl}/inventory/adjustments`, {
            method: "POST",
            headers,
            body: JSON.stringify(adjPayload)
        });
        const adjJson = await adjRes.json();
        if (!adjJson.success)
            throw new Error("Stock Adjustment failed");
        console.log(`✓ Stock audit adjustment logged. Increment: +50 units`);
        // Relocate/Transfer stock
        const transferPayload = {
            sourceWarehouseId: whMumbai,
            targetWarehouseId: whBangalore,
            productId: "prod_composite_kit",
            quantity: 20
        };
        const transRes = await fetch(`${baseUrl}/inventory/transfers`, {
            method: "POST",
            headers,
            body: JSON.stringify(transferPayload)
        });
        const transJson = await transRes.json();
        if (!transJson.success)
            throw new Error("Stock transfer failed");
        console.log(`✓ Internal stock transfer processed: 20 units relocated from Mumbai to Bangalore`);
        // 7. AI Cash Runway Forecasting
        console.log("\n[TEST 7/8] Querying AI Cash Runway Forecaster...");
        const runwayRes = await fetch(`${baseUrl}/analytics/runway`, { headers });
        const runwayJson = await runwayRes.json();
        if (!runwayJson.success || !runwayJson.data.runwayMonths)
            throw new Error("Runway calculations failed");
        console.log(`✓ AI Runway Forecast: ${runwayJson.data.runwayMonths} months of cash liquidity survival remaining`);
        // 8. Balance Sheet Balancing Check
        console.log("\n[TEST 8/8] Verifying Balance Sheet Balancing Equation...");
        const bsRes = await fetch(`${baseUrl}/accounting/reports/balance-sheet`, { headers });
        const bsJson = await bsRes.json();
        if (!bsJson.success)
            throw new Error("Balance sheet query failed");
        const { assetTotal, liabilityTotal, equityTotal, totalLiabilitiesAndEquity } = bsJson.data;
        console.log(`   - Total Assets: ₹${assetTotal.toLocaleString()}`);
        console.log(`   - Total Liabilities: ₹${liabilityTotal.toLocaleString()}`);
        console.log(`   - Total Equity: ₹${equityTotal.toLocaleString()}`);
        console.log(`   - Total Liabilities & Equity: ₹${totalLiabilitiesAndEquity.toLocaleString()}`);
        if (Math.abs(assetTotal - totalLiabilitiesAndEquity) > 0.1) {
            throw new Error(`Balance Sheet unbalanced! Assets (${assetTotal}) !== Liabilities + Equity (${totalLiabilitiesAndEquity})`);
        }
        console.log("✓ Balance Sheet Equation Check: PASS (Assets = Liabilities + Equity)");
        // 9. Work Assignment Task Creation & Comments
        console.log("\n[TEST 9/11] Simulating Work Assignment Tasks & Comments flow...");
        const workTaskPayload = {
            title: "Write Q3 Security Audit Rules",
            description: "Define database security policies to restrict cross-company writes.",
            priority: "high",
            department: "IT Operations",
            assignedTo: employeeId,
            dueDate: "2026-08-30",
            estimatedHours: 12,
            progress: 0,
            status: "assigned"
        };
        const taskRes = await fetch(`${baseUrl}/tasks`, {
            method: "POST",
            headers,
            body: JSON.stringify(workTaskPayload)
        });
        const taskJson = await taskRes.json();
        if (!taskJson.success)
            throw new Error("Task creation failed");
        const createdTaskId = taskJson.data.id;
        console.log(`   - Created Task: ${taskJson.data.title} (ID: ${createdTaskId})`);
        // Update progress & post comment
        const taskUpdateRes = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({
                progress: 25,
                status: "in_progress",
                comment: "Base repository configuration checks are complete."
            })
        });
        const taskUpdateJson = await taskUpdateRes.json();
        if (!taskUpdateJson.success || taskUpdateJson.data.progress !== 25)
            throw new Error("Task update failed");
        console.log(`   - Task Updated: Status '${taskUpdateJson.data.status}', Progress ${taskUpdateJson.data.progress}%, Comment count: ${taskUpdateJson.data.comments.length}`);
        // 10. Slack-like Chat Channels & Messages
        console.log("\n[TEST 10/11] Simulating Slack-like Chat Channels & Messaging...");
        const chanRes = await fetch(`${baseUrl}/communication/channels`, { headers });
        const chanJson = await chanRes.json();
        if (!chanJson.success || chanJson.data.length === 0)
            throw new Error("Communication channels load failed");
        const testChanId = chanJson.data[0].id;
        console.log(`   - Channels loaded: Count = ${chanJson.data.length}, First Channel: #${chanJson.data[0].name}`);
        // Post message
        const msgPayload = {
            channelId: testChanId,
            text: "Hello everyone, please double check the newly assigned security task! @john.doe"
        };
        const msgRes = await fetch(`${baseUrl}/communication/messages`, {
            method: "POST",
            headers,
            body: JSON.stringify(msgPayload)
        });
        const msgJson = await msgRes.json();
        if (!msgJson.success)
            throw new Error("Message posting failed");
        const createdMsgId = msgJson.data.id;
        console.log(`   - Message posted: "${msgJson.data.text}"`);
        // Pin message
        const pinRes = await fetch(`${baseUrl}/communication/messages/${createdMsgId}/pin`, {
            method: "POST",
            headers,
            body: JSON.stringify({ isPinned: true })
        });
        const pinJson = await pinRes.json();
        if (!pinJson.success || !pinJson.data.isPinned)
            throw new Error("Pinning message failed");
        console.log(`   - Message Pin Status: ${pinJson.data.isPinned ? "PINNED" : "UNPINNED"}`);
        // 11. Notification Center Fetch
        console.log("\n[TEST 11/11] Simulating Notification Alerts check...");
        const notifRes = await fetch(`${baseUrl}/communication/notifications`, { headers });
        const notifJson = await notifRes.json();
        if (!notifJson.success)
            throw new Error("Notifications load failed");
        console.log(`   - Notifications Center Loaded: Count = ${notifJson.data.length}`);
        console.log("\n==================================================");
        console.log("   ALL INTEGRATION FLOW TESTS COMPLETED: SUCCESS  ");
        console.log("==================================================");
        cleanup(0);
    }
    catch (error) {
        console.error("\n❌ TEST SUITE FAILED:", error.message);
        cleanup(1);
    }
}
function cleanup(code) {
    server.close(() => {
        process.exit(code);
    });
}
// Start testing server
server = app.listen(PORT, () => {
    console.log(`[TEST RUNNER] Mock server started on port ${PORT}`);
    runTests();
});
//# sourceMappingURL=e2e-flow.test.js.map
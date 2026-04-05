import { Router } from "express";
import {
  getEmployees,
  addEmployee,
  getPayrollRuns,
  addPayrollRun,
} from "../store.js";
import { getUnlinkAddress, runPayroll, getTransactions } from "../unlink.js";

const router = Router();

// Auth middleware — simple password check
router.use((req, res, next) => {
  const auth = req.headers["x-employer-password"];
  if (auth !== process.env.EMPLOYER_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// GET /api/employer/employees
router.get("/employees", async (req, res) => {
  console.log("Get employees")
  const employees = getEmployees();
  // Attach Unlink addresses (derived, not stored)
  console.log("Get withAddresses")
  const withAddresses = await Promise.all(
    employees.map(async (e) => {
      let unlinkAddress = null;
      try {
        unlinkAddress = await getUnlinkAddress(e.unlinkIndex);
      } catch (err) {
        console.error('Failed to get unlink address:', err);
      }
      return { ...e, unlinkAddress, password: undefined }; // never send password
    })
  );
  res.json(withAddresses);
});

// POST /api/employer/employees
router.post("/employees", async (req, res) => {
  const { name, role, evmAddress, salary, password } = req.body;
  if (!name || !salary) {
    return res.status(400).json({ error: "name and salary are required" });
  }
  const employee = addEmployee({
    name,
    role: role || "Employee",
    evmAddress: evmAddress || "0x0000000000000000000000000000000000000000",
    salary,
    password: password || `pass${Date.now()}`,
  });
  let unlinkAddress = null;
  try {
    unlinkAddress = await getUnlinkAddress(employee.unlinkIndex);
  } catch { }
  res.status(201).json({ ...employee, unlinkAddress, password: undefined });
});

// POST /api/employer/payroll
// token defaults to Unlink token on Base Sepolia; override via request body for other networks
router.post("/payroll", async (req, res) => {
  try {
    const { token = "0xC1a5D4E99BB224713dd179eA9CA2Fa6600706210" } = req.body;
    const employees = getEmployees();

    const transfers = employees.map((e) => ({
      employeeIndex: e.unlinkIndex,
      amount: e.salary,
    }));

    const result = await runPayroll(transfers, token);

    const run = addPayrollRun({
      id: result.txId,
      date: new Date().toISOString(),
      employeeCount: employees.length,
      totalAmount: employees
        .reduce((sum, e) => sum + parseFloat(e.salary), 0)
        .toFixed(2),
      status: result.status,
      simulated: result.simulated ?? false,
    });

    res.json({ run, result });
  } catch (err) {
    console.error("Payroll route error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/employer/payroll-history
// Combines in-memory runs (current session, rich metadata) with Unlink engine
// transactions (persistent across cold starts). In-memory entries take priority
// for deduplication so their richer fields (employeeCount, totalAmount) are kept.
router.get("/payroll-history", async (req, res) => {
  const memoryRuns = getPayrollRuns();
  const memoryIds = new Set(memoryRuns.map((r) => r.id));

  let engineRuns = [];
  try {
    const txs = await getTransactions(0);
    engineRuns = (Array.isArray(txs) ? txs : [])
      .filter((tx) => !memoryIds.has(tx.id)) // skip what's already in memory
      .map((tx) => ({
        id: tx.id,
        // Engine may use created_at (ISO string) or timestamp (unix seconds)
        date: tx.created_at ?? (tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : null),
        status: tx.status,
        type: tx.type,
        totalAmount: tx.amount ?? "—",
        employeeCount: "—",
      }));
  } catch (err) {
    console.error("payroll-history engine fetch failed:", err.message);
  }

  res.json([...memoryRuns, ...engineRuns]);
});

export default router;

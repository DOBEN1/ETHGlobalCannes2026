import { Router } from "express";
import {
  getEmployees,
  addEmployee,
  getPayrollRuns,
  addPayrollRun,
} from "../store.js";
import { getUnlinkAddress, runPayroll } from "../unlink.js";

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
router.post("/payroll", async (req, res) => {
  const { token = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" } = req.body; // USDC on Base
  const employees = getEmployees();
  console.log("Employees:" + employees)

  const transfers = employees.map((e) => ({
    employeeIndex: e.unlinkIndex,
    amount: e.salary,
  }));

  console.log("transfers:" + transfers)

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
  console.log(run)
  console.log(result)

  res.json({ run, result });
});

// GET /api/employer/payroll-history
router.get("/payroll-history", (req, res) => {
  res.json(getPayrollRuns());
});

export default router;

import { Router } from "express";
import { getEmployeeByPassword } from "../store.js";
import {
  getUnlinkAddress,
  getBalance,
  getTransactions,
  withdraw,
} from "../unlink.js";
import '@zk-kit/eddsa-poseidon';

const router = Router();

// Auth: employee sends their password in header
function getAuthenticatedEmployee(req) {
  const password = req.headers["x-employee-password"];
  if (!password) return null;
  return getEmployeeByPassword(password);
}

// GET /api/employee/me
router.get("/me", async (req, res) => {
  const employee = getAuthenticatedEmployee(req);
  if (!employee) return res.status(401).json({ error: "Unauthorized" });

  let unlinkAddress = null;
  try {
    unlinkAddress = await getUnlinkAddress(employee.unlinkIndex);
  } catch {}

  res.json({
    id: employee.id,
    name: employee.name,
    role: employee.role,
    salary: employee.salary,
    evmAddress: employee.evmAddress,
    unlinkAddress,
  });
});

// GET /api/employee/balance
router.get("/balance", async (req, res) => {
  const employee = getAuthenticatedEmployee(req);
  if (!employee) return res.status(401).json({ error: "Unauthorized" });

  const balances = await getBalance(employee.unlinkIndex);
  res.json(balances);
});

// GET /api/employee/transactions
router.get("/transactions", async (req, res) => {
  const employee = getAuthenticatedEmployee(req);
  if (!employee) return res.status(401).json({ error: "Unauthorized" });

  const transactions = await getTransactions(employee.unlinkIndex);
  res.json(transactions);
});

// POST /api/employee/withdraw
router.post("/withdraw", async (req, res) => {
  const employee = getAuthenticatedEmployee(req);
  if (!employee) return res.status(401).json({ error: "Unauthorized" });

  const {
    recipientEvmAddress,
    token = "0x7501de8ea37a21e20e6e65947d2ecab0e9f061a7" // unlink token
    // token = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amount,
  } = req.body;

  if (!recipientEvmAddress || !amount) {
    return res
      .status(400)
      .json({ error: "recipientEvmAddress and amount are required" });
  }

  const result = await withdraw(
    employee.unlinkIndex,
    recipientEvmAddress,
    token,
    amount
  );
  res.json(result);
});

export default router;

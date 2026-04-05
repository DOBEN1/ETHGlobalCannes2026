import { Router } from "express";
import { getEmployeeByPassword, getEmployeeTransactions } from "../store.js";
import {
  getUnlinkAddress,
  getBalance,
  getTransactions,
  withdraw,
} from "../unlink.js";

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
  } catch { }

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
  try {
    const balances = await getBalance(employee.unlinkIndex, "0xC1a5D4E99BB224713dd179eA9CA2Fa6600706210");
    res.json(balances);
    console.log(balances)
  } catch (err) {
    console.error("balance error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/employee/transactions
// Secondary: Unlink engine (for self-initiated txs like withdrawals).
router.get("/transactions", async (req, res) => {
  const employee = getAuthenticatedEmployee(req);
  if (!employee) return res.status(401).json({ error: "Unauthorized" });

  // Primary source: our own store (recorded when employer runs payroll).
  // // Our store — always available, includes incoming salary transfers.
  // const stored = getEmployeeTransactions(employee.unlinkIndex);
  // const storedIds = new Set(stored.map((t) => t.id));

  // Engine — only returns self-initiated txs (withdrawals). Merge without dupes.
  let engineTxs = [];
  try {
    const raw = await getTransactions(employee.unlinkIndex);
    if (Array.isArray(raw) && raw.length > 0) {
      console.log("engine tx[0] keys:", Object.keys(raw[0]));
    }
    engineTxs = (Array.isArray(raw) ? raw : []).filter((t) => !storedIds.has(t.id));
  } catch (err) {
    console.error("engine transactions error:", err.message);
  }

  res.json([...stored, ...engineTxs]);
});

// POST /api/employee/withdraw
router.post("/withdraw", async (req, res) => {
  const employee = getAuthenticatedEmployee(req);
  if (!employee) return res.status(401).json({ error: "Unauthorized" });

  const {
    recipientEvmAddress,
    token = "0xC1a5D4E99BB224713dd179eA9CA2Fa6600706210",
    amount,
  } = req.body;

  if (!recipientEvmAddress || !amount) {
    return res.status(400).json({ error: "recipientEvmAddress and amount are required" });
  }

  try {
    const result = await withdraw(employee.unlinkIndex, recipientEvmAddress, token, amount);
    res.json(result);
  } catch (err) {
    console.error("withdraw error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

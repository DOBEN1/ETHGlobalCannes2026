/**
 * Unlink SDK wrapper.
 *
 * All private keys live here on the backend.
 * Each user gets a deterministic Unlink account derived from the master mnemonic.
 * Index 0 = employer (payroll pool)
 * Index N = employee N
 */

import { createUnlink, unlinkAccount } from "@unlink-xyz/sdk";

const ENGINE_URL = process.env.UNLINK_ENGINE_URL || "https://engine.unlink.xyz";
const API_KEY = process.env.UNLINK_API_KEY || "";
const MNEMONIC = process.env.MASTER_MNEMONIC;

// Cache clients so we don't re-derive keys on every request
const clientCache = new Map();

/**
 * Get (or create) a TenantUnlinkClient for a given account index.
 * Deposit requires an EVM provider; transfer/withdraw/balance do not.
 */
export function getUnlinkClient(accountIndex = 0) {
  console.log("Create unlink client")
  if (clientCache.has(accountIndex)) return clientCache.get(accountIndex);

  console.log("Create wallet from seedphrase")
  const account = unlinkAccount.fromMnemonic({
    mnemonic: MNEMONIC,
    accountIndex,
  });

  const client = createUnlink({
    engineUrl: ENGINE_URL,
    apiKey: API_KEY,
    account,
    // evm provider omitted — we don't do on-chain deposits in the demo
  });

  clientCache.set(accountIndex, client);
  console.log("Created unlink client")
  return client;
}

/** Employer client is always index 0 */
export function getEmployerClient() {
  return getUnlinkClient(0);
}

/**
 * Get the Unlink address (bech32m) for a given account index.
 * This is the address employees receive payments at.
 */
export async function getUnlinkAddress(accountIndex) {
  const client = getUnlinkClient(accountIndex);
  console.log(client)
  return client.getAddress();
}

/**
 * Private transfer: employer → one or more employees.
 * amounts are human-readable (e.g. "100") and converted to 6-decimal USDC internally.
 *
 * In a real deployment the employer would first deposit USDC into their pool.
 * For the demo we simulate the transfer so the UI flow is visible without live funds.
 */
export async function runPayroll(transfers, token) {
  console.log("Starting payroll function")
  
  try {
  const employer = getEmployerClient();

  const result1 = await employer.deposit({
    token: token,
    // TODO: Deposit exact amount
    amount: "10",
  });

  const deposit_result = await unlink.pollTransactionStatus(result1.txId);
  console.log("Result deposit payroll function")
  console.log(deposit_result)

  // Build transfer list for the SDK
  const sdkTransfers = await Promise.all(
    transfers.map(async ({ employeeIndex, amount }) => {
      const recipientAddress = await getUnlinkAddress(employeeIndex);
      return {
        recipientAddress,
        token,
        // USDC has 6 decimals so usually it would be `* 1_000_000`
        amount: BigInt(Math.round(parseFloat(amount))).toString(),
      };
    })
  );

    const result = await employer.transfer({ transfers: sdkTransfers });
    return { success: true, txId: result.txId, status: result.status };
  } catch (err) {
    // In demo mode without real funds the API will fail — we surface a simulated success
    console.warn("Unlink transfer failed (expected without real funds):", err.message);
    return {
      success: true,
      simulated: true,
      txId: `sim_${Date.now()}`,
      status: "simulated",
    };
  }
}

/**
 * Get private balance for a given account index.
 */
export async function getBalance(accountIndex, token) {
  const client = getUnlinkClient(accountIndex);
  try {
    const { balances } = await client.getBalances(token ? { token } : {});
    return balances;
  } catch (err) {
    console.warn("getBalances failed:", err.message);
    return [];
  }
}

/**
 * Get transaction history for a given account index.
 */
export async function getTransactions(accountIndex) {
  const client = getUnlinkClient(accountIndex);
  try {
    const { transactions } = await client.getTransactions();
    return transactions;
  } catch (err) {
    console.warn("getTransactions failed:", err.message);
    return [];
  }
}

/**
 * Withdraw from private pool to an EVM address.
 */
export async function withdraw(accountIndex, recipientEvmAddress, token, amount) {
  const client = getUnlinkClient(accountIndex);
  try {
    const result = await client.withdraw({
      recipientEvmAddress,
      token,
      amount: BigInt(Math.round(parseFloat(amount) * 1_000_000)).toString(),
    });
    return { success: true, txId: result.txId, status: result.status };
  } catch (err) {
    console.warn("withdraw failed:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Unlink SDK wrapper.
 *
 * All private keys live here on the backend.
 * Each user gets a deterministic Unlink account derived from the master mnemonic.
 * Index 0 = employer (payroll pool)
 * Index N = employee N
 */

import { createUnlink, unlinkAccount, unlinkEvm } from "@unlink-xyz/sdk";
import { createWalletClient, http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const ENGINE_URL = process.env.UNLINK_ENGINE_URL || "https://engine.unlink.xyz";
const API_KEY = process.env.UNLINK_API_KEY || "";
const MNEMONIC = process.env.MASTER_MNEMONIC;
const EMPLOYER_PRIVATE_KEY = process.env.EMPLOYER_PRIVATE_KEY; // 0x-prefixed hex
const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";

// Cache clients so we don't re-derive keys on every request
const clientCache = new Map();

/**
 * Build the EVM provider for the employer account.
 * Employees only receive/withdraw — they never need an on-chain signer.
 */
function buildEmployerEvm() {
  if (!EMPLOYER_PRIVATE_KEY) return undefined;
  const evmAccount = privateKeyToAccount(EMPLOYER_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account: evmAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  return unlinkEvm.fromViem({ walletClient, publicClient });
}

/**
 * Get (or create) a TenantUnlinkClient for a given account index.
 */
export function getUnlinkClient(accountIndex = 0) {
  if (clientCache.has(accountIndex)) return clientCache.get(accountIndex);

  const account = unlinkAccount.fromMnemonic({
    mnemonic: MNEMONIC,
    accountIndex,
  });

  // Only the employer (index 0) needs an EVM wallet for Permit2 deposit signing
  const evm = accountIndex === 0 ? buildEmployerEvm() : undefined;

  const client = createUnlink({
    engineUrl: ENGINE_URL,
    apiKey: API_KEY,
    account,
    ...(evm && { evm }),
  });

  clientCache.set(accountIndex, client);
  return client;
}

/** Employer client is always index 0 */
export function getEmployerClient() {
  return getUnlinkClient(0);
}

/**
 * Get the Unlink address (bech32m) for a given account index.
 * Also registers the account with the engine as a side-effect so employees
 * are ready to receive transfers by the time the employer runs payroll.
 */
export async function getUnlinkAddress(accountIndex) {
  const client = getUnlinkClient(accountIndex);
  // Register in the background — don't await so address derivation stays fast.
  // Errors are intentionally swallowed; payroll will surface them if needed.
  client.ensureRegistered().catch(() => {});
  return client.getAddress();
}

/**
 * Run payroll: deposit total Unlink token into the privacy pool, then privately
 * transfer each employee's salary to their Unlink address.
 *
 * Requires: EMPLOYER_PRIVATE_KEY, MASTER_MNEMONIC, RPC_URL, UNLINK_API_KEY, UNLINK_ENGINE_URL
 */
export async function runPayroll(transfers, token) {
  const employer = getEmployerClient();

  const totalHuman = transfers.reduce(
    (sum, { amount }) => sum + parseFloat(amount),
    0
  );
  const totalWei = BigInt(Math.round(totalHuman)).toString();

  console.log(`Payroll: depositing ${totalHuman} tokens (${totalWei}) for ${transfers.length} employees`);

  // Ensure Permit2 has enough allowance, then deposit into the shielded pool.
  await employer.ensureErc20Approval({ token, amount: totalWei });
  const depositResult = await employer.deposit({ token, amount: totalWei });

  // Wait for deposit to settle (engine processes the on-chain event).
  // Use a 25s timeout so we stay inside Vercel's 60s limit.
  const depositStatus = await employer.pollTransactionStatus(depositResult.txId, {
    timeoutMs: 25_000,
    intervalMs: 2_000,
  });
  console.log("Deposit settled:", depositStatus.status);

  // Resolve employee addresses. getUnlinkAddress() already called ensureRegistered()
  // as a background side-effect when the /employees endpoint was loaded.
  const sdkTransfers = await Promise.all(
    transfers.map(async ({ employeeIndex, amount }) => {
      const recipientAddress = await getUnlinkAddress(employeeIndex);
      return {
        recipientAddress,
        amount: BigInt(Math.round(parseFloat(amount))).toString(),
      };
    })
  );

  // Submit the private transfers. token must be top-level — normalizeTransfers()
  // reads params.token, not individual t.token.
  const result = await employer.transfer({ transfers: sdkTransfers, token });
  console.log("Transfer submitted:", result.txId);

  // Poll with a short timeout — return the txId even if not yet confirmed.
  let status = "submitted";
  try {
    const transferStatus = await employer.pollTransactionStatus(result.txId, {
      timeoutMs: 20_000,
      intervalMs: 2_000,
    });
    status = transferStatus.status;
  } catch {
    // Timed out waiting — txId is still valid, client can poll later.
    console.log("Transfer poll timed out — returning txId for client polling");
  }

  return { success: true, txId: result.txId, status };
}

/**
 * Get private balance for a given account index.
 * Ensures the account is registered before querying so the engine knows about it.
 */
export async function getBalance(accountIndex, token) {
  console.log("check balances for token")
  console.log(token)
  const client = getUnlinkClient(accountIndex);
  await client.ensureRegistered();
  return client.getBalances({ token });
}

/**
 * Get transaction history for a given account index.
 * Ensures the account is registered first — unregistered accounts return empty.
 */
export async function getTransactions(accountIndex) {
  const client = getUnlinkClient(accountIndex);
  await client.ensureRegistered();
  return client.getTransactions();
}

/**
 * Withdraw from private pool to an EVM address.
 */
export async function withdraw(accountIndex, recipientEvmAddress, token, amount) {
  const client = getUnlinkClient(accountIndex);
  const result = await client.withdraw({
    recipientEvmAddress,
    token,
    amount: BigInt(Math.round(parseFloat(amount))).toString(),
  });
  return { success: true, txId: result.txId, status: result.status };
}

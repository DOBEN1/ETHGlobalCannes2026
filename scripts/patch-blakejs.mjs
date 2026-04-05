/**
 * Legacy compatibility patch — safe no-op with @unlink-xyz/sdk >= 0.1.0-canary.1
 *
 * The old SDK (0.0.2-canary.0) used @zk-kit/eddsa-poseidon → blakejs which had
 * ESM/CJS interop issues on Node 22 and Vercel. The new SDK uses @noble/curves
 * and @noble/hashes instead, so those patches are no longer needed.
 *
 * This script is kept as a no-op so existing postinstall hooks don't break.
 */
console.log("patch-blakejs: nothing to patch with current SDK — skipping");

<template>
  <div class="min-h-screen">
    <!-- Nav -->
    <nav class="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
      <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🌑</span>
          <span class="font-bold text-white text-lg">ShadowPay</span>
          <span class="badge badge-green">Employee</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-400">{{ profile?.name }}</span>
          <button class="btn-secondary text-sm" @click="logout">Sign Out</button>
        </div>
      </div>
    </nav>

    <div class="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <!-- Profile header -->
      <div class="card bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-indigo-800">
        <div class="flex items-center gap-4">
          <div
            class="w-14 h-14 rounded-full bg-indigo-700 flex items-center justify-center text-2xl font-bold"
          >
            {{ profile?.name?.[0] }}
          </div>
          <div>
            <h1 class="text-xl font-bold text-white">{{ profile?.name }}</h1>
            <p class="text-gray-400 text-sm">{{ profile?.role }}</p>
            <p
              v-if="profile?.unlinkAddress"
              class="font-mono text-xs text-indigo-300 mt-1"
            >
              {{ profile.unlinkAddress }}
            </p>
          </div>
        </div>
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <!-- Salary -->
        <div class="card text-center">
          <p class="text-xs text-gray-500 mb-1 uppercase tracking-wide">Your Salary</p>
          <p class="text-2xl font-bold text-emerald-400">
            ${{ Number(profile?.salary).toLocaleString() }}
          </p>
          <p class="text-xs text-gray-500 mt-1">USDC / month</p>
        </div>

        <!-- Private balance -->
        <div class="card text-center">
          <p class="text-xs text-gray-500 mb-1 uppercase tracking-wide">Private Balance</p>
          <div v-if="loadingBalance" class="text-gray-600 text-sm py-1">Loading…</div>
          <p v-else-if="totalBalance !== null" class="text-2xl font-bold text-white">
            ${{ totalBalance.toLocaleString() }}
          </p>
          <p v-else class="text-2xl font-bold text-gray-600">—</p>
          <p class="text-xs text-gray-500 mt-1">Shielded USDC</p>
        </div>

        <!-- Privacy status -->
        <div class="card text-center col-span-2 md:col-span-1">
          <p class="text-xs text-gray-500 mb-1 uppercase tracking-wide">Privacy</p>
          <p class="text-2xl">🔒</p>
          <p class="text-xs text-gray-500 mt-1">ZK-shielded</p>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <!-- Transaction history -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-white">Transaction History</h2>
            <button
              class="text-xs text-indigo-400 hover:text-indigo-300"
              @click="fetchTransactions"
            >
              Refresh
            </button>
          </div>

          <div class="card p-0 overflow-hidden">
            <div v-if="loadingTxs" class="p-6 text-center text-gray-500 text-sm">
              Loading…
            </div>
            <div
              v-else-if="transactions.length === 0"
              class="p-8 text-center text-gray-600 space-y-2"
            >
              <p class="text-2xl">📭</p>
              <p class="text-sm">No transactions yet</p>
              <p class="text-xs text-gray-700">
                Transactions appear after your employer runs payroll
              </p>
            </div>
            <div v-else class="divide-y divide-gray-800">
              <div
                v-for="tx in transactions"
                :key="tx.id"
                class="px-4 py-3 flex items-center justify-between hover:bg-gray-800/30"
              >
                <div class="flex items-center gap-3">
                  <span class="text-lg">
                    {{ tx.type === "deposit" ? "⬇️" : tx.type === "withdraw" ? "⬆️" : "↔️" }}
                  </span>
                  <div>
                    <p class="text-sm font-medium text-white capitalize">{{ tx.type }}</p>
                    <p class="text-xs text-gray-500">
                      {{ new Date(tx.created_at).toLocaleString() }}
                    </p>
                  </div>
                </div>
                <span
                  :class="[
                    'badge',
                    tx.status === 'processed' || tx.status === 'relayed' ? 'badge-green' :
                    tx.status === 'failed' ? 'bg-red-900 text-red-300' :
                    'badge-yellow'
                  ]"
                >
                  {{ tx.status }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right column: Withdraw + Fairness -->
        <div class="space-y-4">
          <!-- Withdraw form -->
          <h2 class="text-lg font-semibold text-white">Withdraw to Wallet</h2>
          <div class="card space-y-4">
            <p class="text-sm text-gray-400">
              Move funds from your private Unlink balance to any EVM wallet.
            </p>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Destination Address</label>
              <input
                v-model="withdrawForm.address"
                class="input font-mono text-sm"
                placeholder="0x..."
              />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Amount (USDC)</label>
              <input
                v-model="withdrawForm.amount"
                class="input"
                type="number"
                placeholder="500"
              />
            </div>
            <button
              class="btn-primary w-full"
              :disabled="withdrawing || !withdrawForm.address || !withdrawForm.amount"
              @click="doWithdraw"
            >
              {{ withdrawing ? "Processing…" : "↑ Withdraw Privately" }}
            </button>
            <div
              v-if="withdrawStatus"
              class="text-sm px-3 py-2 rounded-lg"
              :class="withdrawStatus.success ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'"
            >
              {{ withdrawStatus.message }}
            </div>
          </div>

          <!-- Fairness oracle teaser -->
          <div class="card border-dashed border-gray-700 space-y-3">
            <div class="flex items-center gap-2">
              <span class="text-yellow-400">📊</span>
              <h3 class="font-semibold text-white text-sm">Fairness Oracle</h3>
              <span class="badge badge-yellow">Coming Soon</span>
            </div>
            <p class="text-xs text-gray-500 leading-relaxed">
              See how your salary compares to peers in similar roles — without
              anyone knowing exact figures. Powered by ZK range proofs over the
              Unlink shielded pool.
            </p>
            <div class="space-y-2 opacity-50 pointer-events-none select-none">
              <div class="flex items-center justify-between text-xs">
                <span class="text-gray-400">Your percentile</span>
                <span class="text-white font-semibold">—</span>
              </div>
              <div class="bg-gray-800 rounded-full h-2">
                <div class="bg-indigo-600 h-2 rounded-full w-1/2"></div>
              </div>
              <div class="flex justify-between text-xs text-gray-600">
                <span>Min</span>
                <span>Median</span>
                <span>Max</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";

const router = useRouter();
const auth = useAuthStore();

const profile = ref(auth.employeeProfile);
const balances = ref([]);
const transactions = ref([]);
const loadingBalance = ref(true);
const loadingTxs = ref(true);

const withdrawForm = ref({ address: "", amount: "" });
const withdrawing = ref(false);
const withdrawStatus = ref(null);

const totalBalance = computed(() => {
  if (!balances.value.length) return null;
  return balances.value.reduce(
    (sum, b) => sum + Number(b.amount) / 1_000_000,
    0
  );
});

async function fetchProfile() {
  const res = await fetch("/api/employee/me", {
    headers: auth.employeeHeaders(),
  });
  if (res.ok) {
    profile.value = await res.json();
  }
}

async function fetchBalance() {
  loadingBalance.value = true;
  try {
    const res = await fetch("/api/employee/balance", {
      headers: auth.employeeHeaders(),
    });
    balances.value = await res.json();
  } finally {
    loadingBalance.value = false;
  }
}

async function fetchTransactions() {
  loadingTxs.value = true;
  try {
    const res = await fetch("/api/employee/transactions", {
      headers: auth.employeeHeaders(),
    });
    transactions.value = await res.json();
  } finally {
    loadingTxs.value = false;
  }
}

async function doWithdraw() {
  withdrawing.value = true;
  withdrawStatus.value = null;
  try {
    const res = await fetch("/api/employee/withdraw", {
      method: "POST",
      headers: { ...auth.employeeHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientEvmAddress: withdrawForm.value.address,
        amount: withdrawForm.value.amount,
      }),
    });
    const data = await res.json();
    if (data.success) {
      withdrawStatus.value = {
        success: true,
        message: `Withdrawal initiated — tx: ${data.txId}`,
      };
      withdrawForm.value = { address: "", amount: "" };
      await fetchBalance();
    } else {
      withdrawStatus.value = { success: false, message: data.error };
    }
  } catch (e) {
    withdrawStatus.value = { success: false, message: e.message };
  } finally {
    withdrawing.value = false;
  }
}

function logout() {
  auth.logout();
  router.push("/");
}

onMounted(() => {
  fetchProfile();
  fetchBalance();
  fetchTransactions();
});
</script>

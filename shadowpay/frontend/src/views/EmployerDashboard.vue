<template>
  <div class="min-h-screen">
    <!-- Nav -->
    <nav class="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🌑</span>
          <span class="font-bold text-white text-lg">ShadowPay</span>
          <span class="badge badge-blue">Employer</span>
        </div>
        <button class="btn-secondary text-sm" @click="logout">Sign Out</button>
      </div>
    </nav>

    <div class="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <!-- Stats row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="card text-center">
          <p class="text-3xl font-bold text-white">{{ employees.length }}</p>
          <p class="text-sm text-gray-400 mt-1">Employees</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-emerald-400">
            ${{ totalMonthlyPayroll.toLocaleString() }}
          </p>
          <p class="text-sm text-gray-400 mt-1">Monthly Payroll</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-indigo-400">{{ payrollRuns.length }}</p>
          <p class="text-sm text-gray-400 mt-1">Payroll Runs</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-yellow-400">🔒</p>
          <p class="text-sm text-gray-400 mt-1">ZK Private</p>
        </div>
      </div>

      <!-- Main grid -->
      <div class="grid md:grid-cols-3 gap-6">
        <!-- Employee table (2/3) -->
        <div class="md:col-span-2 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-white">Team Members</h2>
            <button class="btn-primary text-sm" @click="showAddModal = true">
              + Add Employee
            </button>
          </div>

          <div class="card p-0 overflow-hidden">
            <div v-if="loadingEmployees" class="p-8 text-center text-gray-500">
              Loading…
            </div>
            <table v-else class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-800">
                  <th class="text-left px-4 py-3 text-gray-400 font-medium">Name</th>
                  <th class="text-left px-4 py-3 text-gray-400 font-medium">Role</th>
                  <th class="text-right px-4 py-3 text-gray-400 font-medium">Salary/mo</th>
                  <th class="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">
                    Private Address
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="emp in employees"
                  :key="emp.id"
                  class="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <div
                        class="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold"
                      >
                        {{ emp.name[0] }}
                      </div>
                      <span class="font-medium text-white">{{ emp.name }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-gray-400">{{ emp.role }}</td>
                  <td class="px-4 py-3 text-right font-mono text-emerald-400 font-semibold">
                    ${{ Number(emp.salary).toLocaleString() }}
                  </td>
                  <td class="px-4 py-3 hidden md:table-cell">
                    <span
                      v-if="emp.unlinkAddress"
                      class="font-mono text-xs text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded"
                    >
                      {{ emp.unlinkAddress.slice(0, 16) }}…
                    </span>
                    <span v-else class="text-gray-600 text-xs">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Run Payroll button -->
          <div class="card bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border-indigo-800">
            <div class="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 class="font-semibold text-white">Run Monthly Payroll</h3>
                <p class="text-sm text-gray-400 mt-0.5">
                  Privately transfer
                  <span class="text-emerald-400 font-mono">${{ totalMonthlyPayroll.toLocaleString() }} USDC</span>
                  to {{ employees.length }} employees via ZK proofs
                </p>
              </div>
              <button
                class="btn-primary"
                :disabled="runningPayroll || employees.length === 0"
                @click="runPayroll"
              >
                <span v-if="runningPayroll" class="flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Processing…
                </span>
                <span v-else>⚡ Run Payroll</span>
              </button>
            </div>
            <div
              v-if="payrollStatus"
              class="mt-3 text-sm px-3 py-2 rounded-lg"
              :class="payrollStatus.success ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'"
            >
              {{ payrollStatus.message }}
            </div>
          </div>
        </div>

        <!-- Payroll history (1/3) -->
        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-white">Payroll History</h2>
          <div class="space-y-3">
            <div
              v-if="loadingHistory"
              class="card text-center text-gray-500 text-sm"
            >
              Loading…
            </div>
            <div
              v-else-if="payrollRuns.length === 0"
              class="card text-center text-gray-500 text-sm py-8"
            >
              No payroll runs yet
            </div>
            <div
              v-for="run in payrollRuns"
              :key="run.id"
              class="card space-y-2 p-4"
            >
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm font-medium text-white capitalize">
                    {{ run.type ?? "payroll" }}
                    <span v-if="run.totalAmount !== '—'"> · {{ run.totalAmount }} USDC</span>
                  </p>
                  <p class="text-xs text-gray-500 mt-0.5">
                    <span v-if="run.employeeCount !== '—'">{{ run.employeeCount }} employees · </span>
                    {{ formatRunDate(run) }}
                  </p>
                </div>
                <span
                  :class="[
                    'badge',
                    run.status === 'simulated' ? 'badge-yellow' :
                    run.status === 'processed' || run.status === 'relayed' ? 'badge-green' :
                    'badge-blue'
                  ]"
                >
                  {{ run.status }}
                </span>
              </div>
              <p class="font-mono text-xs text-gray-600 truncate">{{ run.id }}</p>
            </div>
          </div>

          <!-- Privacy info card -->
          <div class="card bg-gray-900/50 space-y-3">
            <h3 class="text-sm font-semibold text-white flex items-center gap-2">
              🔐 Privacy Guarantee
            </h3>
            <ul class="text-xs text-gray-400 space-y-2">
              <li class="flex items-start gap-2">
                <span class="text-emerald-400 mt-0.5">✓</span>
                Salary amounts never appear on-chain
              </li>
              <li class="flex items-start gap-2">
                <span class="text-emerald-400 mt-0.5">✓</span>
                Employees cannot see each other's pay
              </li>
              <li class="flex items-start gap-2">
                <span class="text-emerald-400 mt-0.5">✓</span>
                ZK proofs verify validity without revealing amounts
              </li>
              <li class="flex items-start gap-2">
                <span class="text-yellow-400 mt-0.5">◎</span>
                Fairness oracle coming soon
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Employee Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      @click.self="showAddModal = false"
    >
      <div class="card w-full max-w-md space-y-5">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-white">Add Employee</h2>
          <button class="text-gray-500 hover:text-gray-300 text-xl" @click="showAddModal = false">×</button>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Full Name *</label>
            <input v-model="newEmp.name" class="input" placeholder="Jane Doe" />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Role</label>
            <input v-model="newEmp.role" class="input" placeholder="Software Engineer" />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Monthly Salary (USDC) *</label>
            <input v-model="newEmp.salary" class="input" type="number" placeholder="4000" />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">EVM Wallet Address</label>
            <input v-model="newEmp.evmAddress" class="input font-mono" placeholder="0x..." />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Login Password</label>
            <input v-model="newEmp.password" class="input" placeholder="employee-password" />
          </div>
        </div>

        <div class="flex gap-3 justify-end">
          <button class="btn-secondary" @click="showAddModal = false">Cancel</button>
          <button class="btn-primary" :disabled="addingEmployee" @click="addEmployee">
            {{ addingEmployee ? "Adding…" : "Add Employee" }}
          </button>
        </div>
        <p v-if="addError" class="text-red-400 text-sm">{{ addError }}</p>
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

const employees = ref([]);
const payrollRuns = ref([]);
const loadingEmployees = ref(true);
const loadingHistory = ref(true);
const runningPayroll = ref(false);
const payrollStatus = ref(null);
const showAddModal = ref(false);
const addingEmployee = ref(false);
const addError = ref("");

const newEmp = ref({ name: "", role: "", salary: "", evmAddress: "", password: "" });

const totalMonthlyPayroll = computed(() =>
  employees.value.reduce((sum, e) => sum + Number(e.salary), 0)
);

async function fetchEmployees() {
  loadingEmployees.value = true;
  try {
    const res = await fetch("/api/employer/employees", {
      headers: auth.employerHeaders(),
    });
    if (res.ok) employees.value = await res.json();
  } finally {
    loadingEmployees.value = false;
  }
}

async function fetchHistory({ retry = true } = {}) {
  loadingHistory.value = true;
  try {
    const res = await fetch("/api/employer/payroll-history", {
      headers: auth.employerHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      payrollRuns.value = Array.isArray(data) ? data : [];
      // Retry once after 3s if empty — engine registration may not have
      // propagated yet on a fresh serverless cold start.
      if (payrollRuns.value.length === 0 && retry) {
        setTimeout(() => fetchHistory({ retry: false }), 3000);
      }
    }
  } finally {
    loadingHistory.value = false;
  }
}

async function runPayroll() {
  runningPayroll.value = true;
  payrollStatus.value = null;
  try {
    const res = await fetch("/api/employer/payroll", {
      method: "POST",
      headers: { ...auth.employerHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) {
      payrollStatus.value = { success: false, message: `Payroll failed: ${data.error || res.statusText}` };
      return;
    }
    payrollStatus.value = {
      success: true,
      message: `✓ Payroll sent — tx: ${data.run.id.slice(0, 20)}…`,
    };
    await fetchHistory();
  } catch (e) {
    payrollStatus.value = { success: false, message: e.message };
  } finally {
    runningPayroll.value = false;
  }
}

async function addEmployee() {
  addError.value = "";
  if (!newEmp.value.name || !newEmp.value.salary) {
    addError.value = "Name and salary are required";
    return;
  }
  addingEmployee.value = true;
  try {
    const res = await fetch("/api/employer/employees", {
      method: "POST",
      headers: { ...auth.employerHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(newEmp.value),
    });
    if (!res.ok) throw new Error("Failed to add employee");
    showAddModal.value = false;
    newEmp.value = { name: "", role: "", salary: "", evmAddress: "", password: "" };
    await fetchEmployees();
  } catch (e) {
    addError.value = e.message;
  } finally {
    addingEmployee.value = false;
  }
}

function formatRunDate(run) {
  const raw = run.date ?? run.created_at ?? run.timestamp;
  if (!raw) return "—";
  const d = typeof raw === "number" ? new Date(raw * 1000) : new Date(raw);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function logout() {
  auth.logout();
  router.push("/");
}

onMounted(() => {
  fetchEmployees();
  fetchHistory();
});
</script>

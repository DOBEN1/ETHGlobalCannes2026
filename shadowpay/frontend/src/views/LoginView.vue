<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md space-y-8">
      <!-- Logo / Hero -->
      <div class="text-center space-y-3">
        <div class="text-6xl">🌑</div>
        <h1 class="text-4xl font-bold tracking-tight text-white">ShadowPay</h1>
        <p class="text-gray-400 text-lg">
          Private, programmable payroll for global teams
        </p>
        <div class="flex items-center justify-center gap-2 text-xs text-indigo-400">
          <span class="w-2 h-2 rounded-full bg-indigo-400 inline-block"></span>
          Powered by Unlink zero-knowledge proofs
        </div>
      </div>

      <!-- Login Card -->
      <div class="card space-y-6">
        <!-- Role tabs -->
        <div class="flex rounded-lg bg-gray-800 p-1">
          <button
            class="flex-1 py-2 text-sm font-medium rounded-md transition-colors"
            :class="tab === 'employer' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'"
            @click="tab = 'employer'"
          >
            👔 Employer
          </button>
          <button
            class="flex-1 py-2 text-sm font-medium rounded-md transition-colors"
            :class="tab === 'employee' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'"
            @click="tab = 'employee'"
          >
            👤 Employee
          </button>
        </div>

        <!-- Employer login -->
        <div v-if="tab === 'employer'" class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Password</label>
            <input
              v-model="employerPwd"
              type="password"
              class="input"
              placeholder="employer123"
              @keyup.enter="loginAsEmployer"
            />
          </div>
          <div class="bg-gray-800 rounded-lg p-3 text-xs text-gray-400">
            Demo password: <code class="text-indigo-300">employer123</code>
          </div>
          <button class="btn-primary w-full" :disabled="loading" @click="loginAsEmployer">
            <span v-if="loading">Signing in…</span>
            <span v-else>Sign In as Employer →</span>
          </button>
          <p v-if="error" class="text-red-400 text-sm text-center">{{ error }}</p>
        </div>

        <!-- Employee login -->
        <div v-if="tab === 'employee'" class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Employee Password</label>
            <input
              v-model="employeePwd"
              type="password"
              class="input"
              placeholder="alice123"
              @keyup.enter="loginAsEmployee"
            />
          </div>
          <div class="bg-gray-800 rounded-lg p-3 text-xs text-gray-400 space-y-1">
            <p>Demo accounts:</p>
            <p><code class="text-indigo-300">alice123</code> — Alice Chen (Sr. Engineer)</p>
            <p><code class="text-indigo-300">bob123</code> — Bob Martinez (PM)</p>
            <p><code class="text-indigo-300">carol123</code> — Carol Kim (Designer)</p>
          </div>
          <button class="btn-primary w-full" :disabled="loading" @click="loginAsEmployee">
            <span v-if="loading">Signing in…</span>
            <span v-else>Sign In as Employee →</span>
          </button>
          <p v-if="error" class="text-red-400 text-sm text-center">{{ error }}</p>
        </div>
      </div>

      <!-- Feature pills -->
      <div class="flex flex-wrap justify-center gap-2">
        <span class="badge badge-blue">🔒 ZK-private salaries</span>
        <span class="badge badge-green">⚡ Instant global payroll</span>
        <span class="badge badge-yellow">📊 Fairness oracle (soon)</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";

const router = useRouter();
const auth = useAuthStore();

const tab = ref("employer");
const employerPwd = ref("");
const employeePwd = ref("");
const loading = ref(false);
const error = ref("");

async function loginAsEmployer() {
  error.value = "";
  loading.value = true;
  try {
    const res = await fetch("/api/employer/employees", {
      headers: { "x-employer-password": employerPwd.value },
    });
    if (!res.ok) throw new Error("Wrong password");
    auth.loginEmployer(employerPwd.value);
    router.push("/employer");
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function loginAsEmployee() {
  error.value = "";
  loading.value = true;
  try {
    const res = await fetch("/api/employee/me", {
      headers: { "x-employee-password": employeePwd.value },
    });
    if (!res.ok) throw new Error("Wrong password");
    const profile = await res.json();
    auth.loginEmployee(employeePwd.value, profile);
    router.push("/employee");
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

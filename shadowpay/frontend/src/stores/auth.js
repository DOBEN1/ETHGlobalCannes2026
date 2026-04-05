import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useAuthStore = defineStore("auth", () => {
  const role = ref(null); // "employer" | "employee"
  const password = ref(null);
  const employeeProfile = ref(null);

  const isEmployer = computed(() => role.value === "employer");
  const isEmployee = computed(() => role.value === "employee");

  function loginEmployer(pwd) {
    role.value = "employer";
    password.value = pwd;
  }

  function loginEmployee(pwd, profile) {
    role.value = "employee";
    password.value = pwd;
    employeeProfile.value = profile;
  }

  function logout() {
    role.value = null;
    password.value = null;
    employeeProfile.value = null;
  }

  // Header helpers
  function employerHeaders() {
    return { "x-employer-password": password.value };
  }

  function employeeHeaders() {
    return { "x-employee-password": password.value };
  }

  return {
    role,
    password,
    employeeProfile,
    isEmployer,
    isEmployee,
    loginEmployer,
    loginEmployee,
    logout,
    employerHeaders,
    employeeHeaders,
  };
});

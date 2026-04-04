import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth.js";

const routes = [
  {
    path: "/",
    component: () => import("../views/LoginView.vue"),
  },
  {
    path: "/employer",
    component: () => import("../views/EmployerDashboard.vue"),
    meta: { requiresAuth: "employer" },
  },
  {
    path: "/employee",
    component: () => import("../views/EmployeeDashboard.vue"),
    meta: { requiresAuth: "employee" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth === "employer" && !auth.isEmployer) return "/";
  if (to.meta.requiresAuth === "employee" && !auth.isEmployee) return "/";
});

export default router;

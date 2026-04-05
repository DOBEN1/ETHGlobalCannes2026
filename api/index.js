// Vercel serverless entry point (repo root).
// Wraps the Express app — env vars come from Vercel dashboard (no .env needed).
import app from "../shadowpay/backend/app.js";

export default app;

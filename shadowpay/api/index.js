// Vercel serverless entry point — wraps the Express app.
// All /api/* requests are routed here by vercel.json.
import "dotenv/config";
import app from "../backend/app.js";

export default app;

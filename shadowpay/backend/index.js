import "dotenv/config";
import express from "express";
import cors from "cors";
import employerRouter from "./routes/employer.js";
import employeeRouter from "./routes/employee.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

app.use("/api/employer", employerRouter);
app.use("/api/employee", employeeRouter);

app.listen(PORT, () => {
  console.log(`ShadowPay backend running on http://localhost:${PORT}`);
});

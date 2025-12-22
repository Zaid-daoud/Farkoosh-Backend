import express, { NextFunction, Request, Response, urlencoded } from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./modules/auth/auth.routes";
import { ZodError } from "zod";
import { ApiError } from "./core/api/ApiError";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(urlencoded({ extended: true }));

app.get("/health", (_, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

app.use("/api/v1/auth", authRoutes);

// ================= Error Handling Middleware =================
// يجب أن يكون هذا آخر `app.use`
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // 1. إذا كان الخطأ معروفاً (ApiError)
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  // 2. إذا كان الخطأ من Zod Validation
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: err.issues.map((e) => ({ field: e.path[0], message: e.message })),
    });
  }

  // 3. أخطاء غير متوقعة (Internal Server Error)
  console.error(err); // سجل الخطأ في السيرفر
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});
export default app;

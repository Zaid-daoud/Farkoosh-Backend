import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { ApiResponse } from "../../core/api/ApiResponse";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { z } from "zod"; // للتحقق

// مخططات التحقق (Schemas)
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum(["USER", "DRIVER"]).optional(), // لا نسمح بإنشاء أدمن من هنا
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export class AuthController {
  static register = asyncHandler(async (req: Request, res: Response) => {
    // 1. Validate Input
    const validatedData = registerSchema.parse(req.body);

    // 2. Call Service
    const result = await AuthService.register(validatedData);

    // 3. Send Response
    return ApiResponse.success(
      res,
      result,
      "User registered successfully",
      201
    );
  });

  static login = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = loginSchema.parse(req.body);
    const result = await AuthService.login(validatedData);
    return ApiResponse.success(res, result, "Login successful");
  });
}

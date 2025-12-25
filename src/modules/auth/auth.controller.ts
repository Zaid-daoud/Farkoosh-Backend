import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { ApiResponse } from "../../core/api/ApiResponse";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { z } from "zod";

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum(["USER", "DRIVER"]).optional(),
  deviceId: z.string().optional(),
  fcmToken: z.string().optional(),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
  deviceId: z.string().optional(),
  fcmToken: z.string().optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export class AuthController {
  static register = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = registerSchema.parse(req.body);
    const result = await AuthService.register(validatedData);
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

  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    const result = await AuthService.refreshAccessToken(refreshToken);
    return ApiResponse.success(res, result, "Access token refreshed");
  });
}

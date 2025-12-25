import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/db";
import { ApiError } from "../../core/api/ApiError";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access-secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh-secret";
const ACCESS_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_EXPIRY =
  Number(process.env.REFRESH_TOKEN_EXPIRY || 7) * 24 * 60 * 60 * 1000;

export class AuthService {
  static async register(data: any) {
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      gender,
      deviceId,
      fcmToken,
    } = data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ApiError("Email already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          role: role || "USER",
          profile: {
            create: { firstName, lastName, gender: gender },
          },
        },
        include: { profile: true },
      });

      const tokens = this.generateTokens(user.id, user.role);

      await tx.session.create({
        data: {
          userId: user.id,
          refreshToken: tokens.refreshToken,
          deviceInfo: deviceId || "Unknown Device",
          fcmToken: fcmToken || null,
          expiresAt: new Date(Date.now() + REFRESH_EXPIRY),
        },
      });

      return { user, tokens };
    });

    const { passwordHash, ...userWithoutPassword } = result.user;
    return { user: userWithoutPassword, tokens: result.tokens };
  }

  static async login(data: any) {
    const { email, password, deviceId, fcmToken } = data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user || !user.passwordHash) {
      throw new ApiError("Invalid email or password", 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new ApiError("Invalid email or password", 401);
    }

    const tokens = this.generateTokens(user.id, user.role);

    // تسجيل الجلسة في قاعدة البيانات
    // ملاحظة: يمكن هنا التحقق إذا كان هناك جلسة لنفس deviceId وتحديثها بدلاً من إنشاء واحدة جديدة
    // لتجنب تكرار الجلسات لنفس الجهاز
    if (deviceId) {
      // خيار: حذف الجلسات القديمة لنفس الجهاز إن وجدت (اختياري حسب منطق العمل)
      // await prisma.session.deleteMany({ where: { userId: user.id, deviceInfo: deviceId } });
    }

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        deviceInfo: deviceId || "Unknown Device",
        fcmToken: fcmToken || null,
        expiresAt: new Date(Date.now() + REFRESH_EXPIRY),
      },
    });

    const { passwordHash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, tokens };
  }

  static async refreshAccessToken(incomingRefreshToken: string) {
    let decoded: any;
    try {
      decoded = jwt.verify(incomingRefreshToken, REFRESH_SECRET);
    } catch (error) {
      throw new ApiError("Invalid Refresh Token", 401);
    }

    const session = await prisma.session.findUnique({
      where: { refreshToken: incomingRefreshToken },
      include: { user: true },
    });

    if (!session) throw new ApiError("Session not found or revoked", 401);
    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new ApiError("Session expired, please login again", 401);
    }

    const newAccessToken = jwt.sign(
      { id: session.userId, role: session.user.role },
      ACCESS_SECRET,
      { expiresIn: ACCESS_EXPIRY as any }
    );

    return { accessToken: newAccessToken };
  }

  private static generateTokens(userId: string, role: string) {
    const accessToken = jwt.sign({ id: userId, role }, ACCESS_SECRET, {
      expiresIn: ACCESS_EXPIRY as any,
    });

    const refreshToken = jwt.sign({ id: userId }, REFRESH_SECRET, {
      expiresIn: "7d",
    });

    return { accessToken, refreshToken };
  }
}

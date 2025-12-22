import { PrismaClient } from "@prisma/client/extension";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiError } from "../../core/api/ApiError";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key"; // ضعه في .env لاحقاً

export class AuthService {
  // 1. تسجيل مستخدم جديد
  static async register(data: any) {
    const { email, password, firstName, lastName, role } = data;

    // هل الإيميل موجود؟
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ApiError("Email already exists", 400);
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // إنشاء المستخدم + البروفايل في عملية واحدة (Transaction ضمنية)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        role: role || "USER", // افتراضياً مستخدم عادي
        profile: {
          create: {
            firstName,
            lastName,
          },
        },
      },
      include: { profile: true }, // لإرجاع البيانات كاملة
    });

    // إنشاء التوكن
    const token = this.generateToken(user.id, user.role);

    // إخفاء الهاش من الرد
    const { passwordHash, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  // 2. تسجيل الدخول
  static async login(data: any) {
    const { email, password } = data;

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

    const token = this.generateToken(user.id, user.role);
    const { passwordHash, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  // دالة مساعدة لتوليد التوكن
  private static generateToken(userId: string, role: string) {
    return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: "7d" });
  }
}

import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "./session";
export * from "./session";

export const HARBINGER_DOMAIN = "@harbingergroup.com";

// Helper to generate strong temporary password
export function generateTemporaryPassword(): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = uppercase + lowercase + digits + symbols;

  let pwd = "";
  pwd += uppercase.charAt(randomInt(uppercase.length));
  pwd += lowercase.charAt(randomInt(lowercase.length));
  pwd += digits.charAt(randomInt(digits.length));
  pwd += symbols.charAt(randomInt(symbols.length));

  for (let i = 4; i < 14; i++) {
    pwd += all.charAt(randomInt(all.length));
  }
  return pwd;
}

// 1. Company Domain Check (@harbingergroup.com)
export function validateCompanyEmail(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@harbingergroup\.com$/.test(clean);
}

// 2. Password Strength Check (At least 10 chars, strength score 0-4)
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  message?: string;
} {
  if (!password || password.length < 10 || Buffer.byteLength(password, "utf8") > 72) {
    return {
      valid: false,
      score: Math.min(1, Math.floor((password?.length || 0) / 3)),
      message: "Use at least 10 characters and no more than 72 UTF-8 bytes.",
    };
  }

  let score = 1;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  return {
    valid: score >= 2,
    score,
    message: score >= 2 ? undefined : "Include numbers, uppercase letters, or special characters.",
  };
}

// 3. Password Hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 5. In-Memory Rate Limiter (5 attempts per 15 mins)
interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
}
const loginRateLimitMap = new Map<string, RateLimitRecord>();

export function checkLoginRateLimit(key: string): { allowed: boolean; waitMinutes?: number } {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const record = loginRateLimitMap.get(key);
  if (!record) {
    loginRateLimitMap.set(key, { attempts: 1, firstAttemptAt: now });
    return { allowed: true };
  }

  if (now - record.firstAttemptAt > windowMs) {
    // Reset window
    loginRateLimitMap.set(key, { attempts: 1, firstAttemptAt: now });
    return { allowed: true };
  }

  if (record.attempts >= maxAttempts) {
    const remainingMs = windowMs - (now - record.firstAttemptAt);
    const waitMinutes = Math.ceil(remainingMs / 60000);
    return { allowed: false, waitMinutes };
  }

  record.attempts += 1;
  return { allowed: true };
}

export function resetLoginRateLimit(key: string): void {
  loginRateLimitMap.delete(key);
}

export function clearLoginRateLimits(email: string): void {
  for (const key of loginRateLimitMap.keys()) {
    if (key.startsWith(`${email.toLowerCase()}:`)) loginRateLimitMap.delete(key);
  }
}

// 6. Get Current User Server Helper
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload) return null;

    // Check database to ensure user is active and exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        sessionVersion: true,
      },
    });

    if (!user || !user.isActive || user.sessionVersion !== (payload.sessionVersion ?? 0)) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

// 7. Get Session From Request (extracts cookie from req headers or cookies store)
export async function getSessionFromRequest(req?: Request, allowPasswordChange = false): Promise<SessionPayload | null> {
  try {
    if (req) {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`));
      const token = match ? decodeURIComponent(match[1]) : null;
      if (token) return await validateActiveSession(token, allowPasswordChange);
      return null;
    }
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await validateActiveSession(token, allowPasswordChange);
  } catch {
    return null;
  }
}

async function validateActiveSession(token: string, allowPasswordChange: boolean) {
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user?.isActive || user.sessionVersion !== (payload.sessionVersion ?? 0)) return null;
  if (user.mustChangePassword && !allowPasswordChange) return null;
  return { ...payload, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword, sessionVersion: user.sessionVersion };
}

// 7. Audit Log Helper
export async function logAuditEvent({
  actorId,
  targetUserId,
  applicationId,
  action,
  details,
  ipAddress,
  userAgent,
}: {
  actorId?: string | null;
  targetUserId?: string | null;
  applicationId?: string | null;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actorId ?? null,
        targetUserId: targetUserId ?? null,
        applicationId: applicationId ?? null,
        action,
        details: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
}

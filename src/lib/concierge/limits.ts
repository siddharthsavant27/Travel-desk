import { prisma } from "@/lib/prisma";
import type { ConciergeConfig } from "./config";
import { ConciergeError } from "./protocol";

export async function acquireTurn(userId: string, requestId: string, config: ConciergeConfig, now = Date.now()) {
  const minute = Math.floor(now / 60000), day = Math.floor(now / 86400000);
  const windows = [
    { key: `user:${userId}:minute:${minute}`, limit: config.perMinute, end: (minute + 1) * 60000 },
    { key: `user:${userId}:day:${day}`, limit: config.perDay, end: (day + 1) * 86400000 },
    { key: `site:day:${day}`, limit: config.sitePerDay, end: (day + 1) * 86400000 },
  ];
  const result = await prisma.$transaction(async (db) => {
    // Acquire SQLite's write lock before any reads. All workers share these limits.
    await db.conciergeLease.deleteMany({ where: { expiresAt: { lte: new Date(now) } } });
    await db.conciergeQuota.deleteMany({ where: { expiresAt: { lte: new Date(now) } } });
    for (const window of windows) {
      const counter = await db.conciergeQuota.findUnique({ where: { key: window.key } });
      if (counter && counter.count >= window.limit) return { status: 429, retryAfter: Math.ceil((window.end - now) / 1000) };
    }
    for (const window of windows) {
      await db.conciergeQuota.upsert({
        where: { key: window.key },
        create: { key: window.key, count: 1, expiresAt: new Date(window.end) },
        update: { count: { increment: 1 } },
      });
    }
    const active = await db.conciergeLease.findMany({ select: { slot: true, userId: true } });
    if (active.some((lease) => lease.userId === userId)) return { status: 429, retryAfter: 5 };
    const slot = Array.from({ length: 8 }, (_, i) => i).find((i) => !active.some((lease) => lease.slot === i));
    if (slot === undefined) return { status: 429, retryAfter: 5 };
    await db.conciergeLease.create({ data: { slot, userId, requestId, expiresAt: new Date(now + config.timeout + 5000) } });
    return { status: 200, retryAfter: undefined };
  }, { maxWait: 5000, timeout: 10000 });
  if (result.status !== 200) throw new ConciergeError(429, "The assistant is busy or your usage limit has been reached. Please try again later.", result.retryAfter);
}

export async function releaseTurn(requestId: string) {
  await prisma.conciergeLease.deleteMany({ where: { requestId } });
}

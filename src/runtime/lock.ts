import Redis from "ioredis";

export type RuntimeLock = {
  key: string;
  token: string;
};

function randomToken(): string {
  return `lock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function acquireConversationLock(
  redis: Redis,
  conversationId: string,
  ttlMs: number,
): Promise<RuntimeLock | null> {
  const key = `ju:cognitive:lock:${conversationId}`;
  const token = randomToken();
  const result = await redis.set(key, token, "PX", ttlMs, "NX");
  return result === "OK" ? { key, token } : null;
}

export async function releaseConversationLock(redis: Redis, lock: RuntimeLock): Promise<void> {
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    end
    return 0
  `;
  await redis.eval(script, 1, lock.key, lock.token);
}


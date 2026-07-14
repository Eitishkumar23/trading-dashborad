import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

redis.on("connect", () => {
    console.log("[redis] Connected successfully");
});

redis.on("error", (err) => {
    console.error("[redis] Connection error:", err.message);
});

export default redis;
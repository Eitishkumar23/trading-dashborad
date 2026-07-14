import Redis from "ioredis";

const redis = new Redis();

async function run() {
    await redis.set("greeting", "hello from node", "EX", 15);
    console.log("Set a key with 15 second expiry");

    const value = await redis.get("greeting");
    console.log("Got back:", value);

    const ttl = await redis.ttl("greeting");
    console.log("Seconds remaining:", ttl);

    redis.quit();
}

run();
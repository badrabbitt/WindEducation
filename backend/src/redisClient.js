// src/redisClient.js

const { createClient } = require("redis");

const client = createClient({
  username: "default",
  password: "y55SYxDnDQ2wQ45CuIp4hoCnCw2PlWtt",
  socket: {
    host: "redis-12336.c266.us-east-1-3.ec2.redns.redis-cloud.com",
    port: 12336,
  },
});

client.on("error", (err) => console.log("Redis Client Error", err));

(async () => {
  try {
    await client.connect();
    console.log("✅ Redis connected.");
  } catch (err) {
    console.error("❌ Failed to connect Redis:", err);
  }
})();

module.exports = client;

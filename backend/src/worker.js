// src/worker.js

require("dotenv").config();
const redisClient = require("./redisClient");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const INTERACTIONS_KEY = "interaction_logs";
const SESSION_STATS_KEY = "session_stats";

async function processInteractionLogs() {
  while (true) {
    const raw = await redisClient.RPOP(INTERACTIONS_KEY);
    if (!raw) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    let log;
    try {
      log = JSON.parse(raw);
    } catch (err) {
      console.error("❌ JSON.parse error:", err, raw);
      continue;
    }

    const { question_id, is_correct, skipped, latency_ms, timestamp } = log;
    try {
      await prisma.interactionLog.create({
        data: {
          question_id,
          is_correct,
          skipped,
          latency_ms,
          timestamp: BigInt(timestamp),
        },
      });
      console.log(`✅ Insert interaction question_id=${question_id}`);
    } catch (err) {
      console.error("❌ Lỗi insert interaction:", err, log);
    }
  }
}

async function processSessionStats() {
  while (true) {
    const raw = await redisClient.RPOP(SESSION_STATS_KEY);
    if (!raw) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    let item;
    try {
      item = JSON.parse(raw);
    } catch (err) {
      console.error("❌ JSON.parse session-stats error:", err, raw);
      continue;
    }

    const {
      appear,
      correct_pct,
      wrong_pct,
      skip_count,
      avg_time_ms,
      timestamp,
    } = item;

    try {
      await prisma.sessionStat.create({
        data: {
          appear,
          correct_pct,
          wrong_pct,
          skip_count,
          avg_time_ms,
          timestamp: BigInt(timestamp),
        },
      });
      console.log(`✅ Insert session-stats (appear=${appear})`);
    } catch (err) {
      console.error("❌ Lỗi insert session-stats:", err, item);
    }
  }
}

async function main() {
  console.log("🚀 Worker đang chạy...");
  processInteractionLogs();
  processSessionStats();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

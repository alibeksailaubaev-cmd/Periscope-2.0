// Vercel Serverless Function: GET/POST chat messages.
// Storage: Upstash Redis (free tier, REST API — no persistent connection needed,
// which fits the serverless execution model).
//
// Required env vars (set in Vercel Project Settings → Environment Variables):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const STREAM_KEY = "periscope:messages";
const MAX_STORED = 200;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    const after = Number(req.query.after || 0);
    const raw = await redis.lrange(STREAM_KEY, 0, MAX_STORED - 1);
    const messages = raw
      .map((item) => (typeof item === "string" ? JSON.parse(item) : item))
      .filter((m) => m.id > after)
      .sort((a, b) => a.id - b.id);
    return res.status(200).json({ messages });
  }

  if (req.method === "POST") {
    const { nick, text, color } = req.body || {};
    if (!nick || !text) {
      return res.status(400).json({ error: "nick and text are required" });
    }

    const message = {
      id: Date.now(),
      nick: String(nick).slice(0, 20),
      text: String(text).slice(0, 150),
      color: color || "#1e90ff",
    };

    await redis.lpush(STREAM_KEY, JSON.stringify(message));
    await redis.ltrim(STREAM_KEY, 0, MAX_STORED - 1);

    return res.status(201).json({ message });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// Vercel Serverless Function: GET current like count / POST to increment it.
// Storage: Upstash Redis (free tier, REST API).
//
// Required env vars (set in Vercel Project Settings → Environment Variables):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const LIKES_KEY = "periscope:likes";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    const total = Number((await redis.get(LIKES_KEY)) || 0);
    return res.status(200).json({ total });
  }

  if (req.method === "POST") {
    const total = await redis.incr(LIKES_KEY);
    return res.status(200).json({ total });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

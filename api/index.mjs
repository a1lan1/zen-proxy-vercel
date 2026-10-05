import { router } from "../zen-proxy.mjs"

/** Vercel Node serverless entry — all routes go through zen-proxy's router. */
export default function handler(req, res) {
  return router(req, res)
}

export const config = {
  maxDuration: 60,
}

import { router } from "../zen-proxy.mjs"

/** Vercel Node serverless entry — all routes go through zen-proxy's router. */
export default async function handler(req, res) {
  await router(req, res)
}

export const config = {
  maxDuration: 300,
}

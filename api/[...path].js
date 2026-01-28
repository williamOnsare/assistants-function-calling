/**
 * Vercel serverless handler for /api/* — forwards all API requests (single or multi-segment) to the Express app.
 */
import app from "../server/server.js";

export default function handler(req, res) {
  return app(req, res);
}

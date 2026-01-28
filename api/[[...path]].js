/**
 * Vercel serverless handler for /api/* — forwards all API requests to the Express app.
 * Pass (req, res) directly to Express; serverless-http is for Lambda and can hang on Vercel.
 */
import app from "../server/server.js";

export default function handler(req, res) {
  return app(req, res);
}

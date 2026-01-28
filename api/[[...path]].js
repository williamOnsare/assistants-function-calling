/**
 * Vercel serverless handler for /api/* — forwards all API requests to the Express app.
 * This ensures /api/* returns JSON from the backend instead of the SPA index.html.
 */
import app from "../server/server.js";
import serverless from "serverless-http";

export default serverless(app);

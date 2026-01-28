/**
 * Vercel entry: re-exports the Express app and serves the built client (SPA).
 * Only used when deploying to Vercel; local dev uses client (Vite) + server separately.
 */
import app from "../server/server.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

if (process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, "../client/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

export default app;

// server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

// ===== Middleware =====
app.use(cors());
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(__dirname));

// ===== In-memory storage =====
const servers = {};

// ===== API Routes =====

// GET /api/data -> fetch all servers & messages
app.get("/api/data", (req, res) => {
  res.json(servers);
});

// POST /api/server -> create new server
app.post("/api/server", (req, res) => {
  const { server } = req.body;
  if (!server) {
    return res.status(400).json({ error: "No server name provided" });
  }
  if (!servers[server]) {
    servers[server] = { messages: [] };
  }
  res.json({ success: true, server });
});

// POST /api/message -> send message to a server
app.post("/api/message", (req, res) => {
  const { server, username, text } = req.body;
  if (!server || !username || !text) {
    return res.status(400).json({ error: "Missing fields" });
  }
  if (!servers[server]) {
    servers[server] = { messages: [] };
  }
  servers[server].messages.push({
    username,
    text,
    time: new Date().toISOString(),
  });
  res.json({ success: true });
});

// Serve index.html for the root path
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ===== Start server =====
app.listen(PORT, "0.0.0.0", () => {
  console.log(`DALChat server running on http://0.0.0.0:${PORT}`);
});

// api/server.js
import express from "express";
import cors from "cors";
import { parse } from "url";

const app = express();

// ===== Middleware =====
app.use(cors());
app.use(express.json());

// ===== In-memory storage =====
const servers = {};

// ===== Routes =====

// GET /data -> fetch all servers & messages
app.get("/data", (req, res) => {
  res.json(servers);
});

// POST /server -> create new server
app.post("/server", (req, res) => {
  const { server } = req.body;
  if (!server) {
    return res.status(400).json({ error: "No server name provided" });
  }
  if (!servers[server]) {
    servers[server] = { messages: [] };
  }
  res.json({ success: true, server });
});

// POST /message -> send message to a server
app.post("/message", (req, res) => {
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

// ===== 404 handler =====
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// ===== Vercel serverless export =====
export default (req, res) => {
  const { pathname } = parse(req.url, true);
  req.url = pathname; // Express needs the pathname to route correctly
  app(req, res);
};

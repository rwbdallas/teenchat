// server.js
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

console.log("✅ DALChat Node backend running...");

// In-memory storage for servers and messages
const servers = {};

// ===== GET /data -> fetch all servers & messages
app.get("/data", (req, res) => {
  res.json(servers);
});

// ===== POST /server -> create new server
app.post("/server", (req, res) => {
  try {
    const { server } = req.body;
    if (!server) throw new Error("No server name provided");
    if (!servers[server]) servers[server] = { messages: [] };
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ===== POST /message -> send message
app.post("/message", (req, res) => {
  try {
    const { server, username, text } = req.body;
    if (!server || !username || !text) throw new Error("Missing fields");
    if (!servers[server]) servers[server] = { messages: [] };
    servers[server].messages.push({
      username,
      text,
      time: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ===== 404 for other routes
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

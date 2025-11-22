// server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import crypto from "crypto";

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
const users = {}; // { userId: { id, email, password, displayName } }
const servers = {}; // { serverId: { id, name, ownerId, channels: [], members: {}, messages: {} } }
const sessions = {}; // { token: userId }

// Helper: Password hashing with bcrypt
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Helper: Generate session token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware: Verify authentication token
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !sessions[token]) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  req.userId = sessions[token];
  next();
}

// ===== API Routes =====

// POST /api/signup -> register new user
app.post("/api/signup", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    if (Object.values(users).find(u => u.email === email)) {
      return res.status(400).json({ error: "Email already registered" });
    }
    
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const user = {
      id: userId,
      email,
      password: await hashPassword(password),
      displayName,
      createdAt: new Date().toISOString()
    };
    
    users[userId] = user;
    
    const token = generateToken();
    sessions[token] = userId;
    
    res.json({ 
      success: true, 
      user: { id: user.id, email: user.email, displayName: user.displayName },
      token
    });
  } catch (error) {
    res.status(500).json({ error: "Signup failed" });
  }
});

// POST /api/login -> login user
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }
    
    const user = Object.values(users).find(u => u.email === email);
    
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    const token = generateToken();
    sessions[token] = user.id;
    
    res.json({ 
      success: true, 
      user: { id: user.id, email: user.email, displayName: user.displayName },
      token
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/servers -> get all servers for user
app.get("/api/servers", (req, res) => {
  const { userId } = req.query;
  
  const userServers = Object.values(servers).filter(server => 
    server.members[userId]
  );
  
  res.json({ servers: userServers });
});

// POST /api/servers -> create new server
app.post("/api/servers", (req, res) => {
  const { name, userId, userDisplayName } = req.body;
  
  if (!name || !userId) {
    return res.status(400).json({ error: "Missing server name or user ID" });
  }
  
  const serverId = `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const server = {
    id: serverId,
    name,
    ownerId: userId,
    createdAt: new Date().toISOString(),
    channels: [
      { id: 'general', name: 'general', createdAt: new Date().toISOString() },
      { id: 'announcements', name: 'announcements', createdAt: new Date().toISOString() }
    ],
    members: {
      [userId]: {
        userId,
        displayName: userDisplayName,
        role: 'owner',
        joinedAt: new Date().toISOString()
      }
    },
    messages: {}
  };
  
  servers[serverId] = server;
  
  res.json({ success: true, server });
});

// POST /api/servers/:serverId/channels -> create new channel
app.post("/api/servers/:serverId/channels", (req, res) => {
  const { serverId } = req.params;
  const { name, userId } = req.body;
  
  const server = servers[serverId];
  if (!server) {
    return res.status(404).json({ error: "Server not found" });
  }
  
  const member = server.members[userId];
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  
  const channelId = name.toLowerCase().replace(/\s+/g, '-');
  
  if (server.channels.find(c => c.id === channelId)) {
    return res.status(400).json({ error: "Channel already exists" });
  }
  
  const channel = {
    id: channelId,
    name,
    createdAt: new Date().toISOString()
  };
  
  server.channels.push(channel);
  
  res.json({ success: true, channel });
});

// DELETE /api/servers/:serverId/channels/:channelId -> delete channel
app.delete("/api/servers/:serverId/channels/:channelId", (req, res) => {
  const { serverId, channelId } = req.params;
  const { userId } = req.query;
  
  const server = servers[serverId];
  if (!server) {
    return res.status(404).json({ error: "Server not found" });
  }
  
  const member = server.members[userId];
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  
  if (channelId === 'general') {
    return res.status(400).json({ error: "Cannot delete general channel" });
  }
  
  server.channels = server.channels.filter(c => c.id !== channelId);
  delete server.messages[channelId];
  
  res.json({ success: true });
});

// GET /api/servers/:serverId/messages/:channelId -> get messages
app.get("/api/servers/:serverId/messages/:channelId", (req, res) => {
  const { serverId, channelId } = req.params;
  
  const server = servers[serverId];
  if (!server) {
    return res.status(404).json({ error: "Server not found" });
  }
  
  const messages = server.messages[channelId] || [];
  
  res.json({ messages });
});

// POST /api/servers/:serverId/messages/:channelId -> send message
app.post("/api/servers/:serverId/messages/:channelId", (req, res) => {
  const { serverId, channelId } = req.params;
  const { userId, username, text } = req.body;
  
  if (!text || !userId || !username) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  const server = servers[serverId];
  if (!server) {
    return res.status(404).json({ error: "Server not found" });
  }
  
  if (!server.messages[channelId]) {
    server.messages[channelId] = [];
  }
  
  const message = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    username,
    text,
    time: new Date().toISOString()
  };
  
  server.messages[channelId].push(message);
  
  res.json({ success: true, message });
});

// POST /api/servers/:serverId/join -> join server
app.post("/api/servers/:serverId/join", (req, res) => {
  const { serverId } = req.params;
  const { userId, displayName } = req.body;
  
  const server = servers[serverId];
  if (!server) {
    return res.status(404).json({ error: "Server not found" });
  }
  
  if (server.members[userId]) {
    return res.json({ success: true, message: "Already a member" });
  }
  
  server.members[userId] = {
    userId,
    displayName,
    role: 'member',
    joinedAt: new Date().toISOString()
  };
  
  res.json({ success: true });
});

// PUT /api/servers/:serverId/members/:memberId/role -> update member role
app.put("/api/servers/:serverId/members/:memberId/role", (req, res) => {
  const { serverId, memberId } = req.params;
  const { userId, newRole } = req.body;
  
  const server = servers[serverId];
  if (!server) {
    return res.status(404).json({ error: "Server not found" });
  }
  
  const requestingMember = server.members[userId];
  if (!requestingMember || requestingMember.role !== 'owner') {
    return res.status(403).json({ error: "Only server owner can change roles" });
  }
  
  const targetMember = server.members[memberId];
  if (!targetMember) {
    return res.status(404).json({ error: "Member not found" });
  }
  
  if (!['owner', 'admin', 'moderator', 'member'].includes(newRole)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  
  targetMember.role = newRole;
  
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

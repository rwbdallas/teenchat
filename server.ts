// server.ts
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

console.log("✅ S13Chat Deno backend running...");

// In-memory storage for servers and messages
const servers: Record<string, { messages: Array<{ username: string; text: string; time: string }> }> = {};

// Start HTTP server
serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // ===== GET /data -> fetch all servers & messages
  if (req.method === "GET" && path === "/data") {
    return new Response(JSON.stringify(servers), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ===== POST /server -> create new server
  if (req.method === "POST" && path === "/server") {
    try {
      const body = await req.json();
      const { server } = body;
      if (!server) throw new Error("No server name provided");
      if (!servers[server]) servers[server] = { messages: [] };
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 400 });
    }
  }

  // ===== POST /message -> send message
  if (req.method === "POST" && path === "/message") {
    try {
      const body = await req.json();
      const { server, username, text } = body;
      if (!server || !username || !text) throw new Error("Missing fields");
      if (!servers[server]) servers[server] = { messages: [] };
      servers[server].messages.push({ username, text, time: new Date().toISOString() });
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 400 });
    }
  }

  // ===== 404 for other routes
  return new Response(JSON.stringify({ error: "Not Found" }), { status: 404 });
});

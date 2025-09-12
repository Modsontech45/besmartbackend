import WebSocket, { WebSocketServer } from "ws";

// Keep track of connected clients
export const wss = new WebSocketServer({ noServer: true });
export const clients = new Map();

export const handleConnection = (ws, request) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const apiKey = url.searchParams.get("api_key");

  if (!apiKey) {
    ws.close(1008, "API key required");
    return;
  }

  if (!clients.has(apiKey)) clients.set(apiKey, new Set());
  clients.get(apiKey).add(ws);

  ws.on("close", () => clients.get(apiKey).delete(ws));
  ws.on("message", (msg) => console.log(`Received from ${apiKey}:`, msg.toString()));

  console.log(`ESP32 connected with API key: ${apiKey}`);
};

// Broadcast updates to all ESP32 clients with the same API key
export const broadcastToApiKey = (apiKey, data) => {
  const set = clients.get(apiKey);
  if (!set) return;

  const msg = JSON.stringify(data);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
};

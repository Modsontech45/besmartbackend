// server.js
import http from "http";
import app from "./app.js";
import { wss, handleConnection } from "./websocket.js";

const PORT = process.env.PORT || 3000;

// Create raw HTTP server from Express app
const server = http.createServer(app);

// Attach WebSocket server
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    handleConnection(ws, request);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`HTTP + WebSocket server running at http://localhost:${PORT}`);
  console.log("Available API endpoints:");
  app.listEndpoints();
});

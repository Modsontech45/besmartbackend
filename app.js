// app.js
import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.js";
import deviceRoutes from "./src/routes/devices.js";
import listEndpoints from "express-list-endpoints";

const app = express();

const allowedOrigins = [
  "https://besmart-delta.vercel.app", // production frontend
  "capacitor://localhost",
  "ionic://localhost"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      // No origin (native apps, curl, server-to-server)
      return callback(null, true);
    }

    // ✅ Always allow production + capacitor origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // ✅ Allow localhost on http/https with any port
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // ✅ Allow 127.0.0.1 on http/https with any port
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // ✅ Allow LAN devices (192.168.x.x and 10.x.x.x ranges)
    if (
      /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
      /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }

    // ❌ Anything else is blocked
    console.warn("❌ Blocked by CORS:", origin);
    return callback(new Error("CORS not allowed for this origin"), false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.use(express.json());
app.options("*", cors());

// --- Middleware to log all incoming requests ---
app.use((req, res, next) => {
  console.log(`\nIncoming Request:`);
  console.log(`Method: ${req.method}`);
  console.log(`URL origin: ${req.originalUrl}`);
  console.log(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
  console.log(`Body: ${JSON.stringify(req.body, null, 2)}`);
  next();
});

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/devices", deviceRoutes);

// --- Utility: list endpoints in console ---
app.listEndpoints = () => {
  const endpoints = listEndpoints(app);
  endpoints.forEach((ep) => {
    ep.methods.forEach((method) => {
      console.log(`${method.padEnd(10)} | ${ep.path}`);
    });
  });
};

// Export app for server + WebSocket integration
export default app;

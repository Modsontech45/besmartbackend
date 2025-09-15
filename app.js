// app.js
import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.js";
import deviceRoutes from "./src/routes/devices.js";
import listEndpoints from "express-list-endpoints";

const app = express();

const allowedOrigins = [
  "https://besmart-delta.vercel.app", // your production frontend
  "capacitor://localhost",
  "ionic://localhost"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      // No origin (like native HTTP requests) → allow
      return callback(null, true);
    }

    if (
      allowedOrigins.includes(origin) ||
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||         // allow localhost:* 
      /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||      // allow 127.0.0.1:* 
      /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)   // allow LAN devices
    ) {
      return callback(null, true);
    }

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
  console.log(`URL: ${req.originalUrl}`);
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

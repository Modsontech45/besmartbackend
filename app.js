// app.js
import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.js";
import deviceRoutes from "./src/routes/devices.js";
import listEndpoints from "express-list-endpoints";

const app = express();

// --- Allowed origins ---
const allowedOrigins = [
  "http://localhost:8080",
  "capacitor://localhost",               // Capacitor Android/iOS
  "http://127.0.0.1:5500",
  "http://localhost:5173",
  "https://besmart-delta.vercel.app",    // deployed React app
];

// --- CORS middleware ---
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (e.g., mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    return callback(new Error("CORS not allowed for this origin"), false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

// Enable preflight for all routes
app.options("*", cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

// --- Body parser ---
app.use(express.json());

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

// --- Export app for server + WebSocket integration ---
export default app;

import jwt from "jsonwebtoken";
import pool from "../db/index.js";

export const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided or wrong format" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await pool.query("SELECT * FROM users WHERE id=$1", [decoded.id]);
    if (!user.rows.length) return res.status(401).json({ error: "User not found" });

    req.user = user.rows[0];
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.api_key;
  if (!apiKey) return res.status(401).json({ error: "API key required" });

  const user = await pool.query("SELECT * FROM users WHERE api_key=$1", [apiKey]);
  if (!user.rows.length) return res.status(401).json({ error: "Invalid API key" });

  req.user = user.rows[0];
  next();
};

export const authenticateUserId = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided or wrong format" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userResult = await pool.query("SELECT id, email FROM users WHERE id=$1", [decoded.id]);
    if (!userResult.rows.length) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = userResult.rows[0];
    req.userId = userResult.rows[0].id; // ✅ attach userId for controllers
    next();
  } catch (err) {
    console.error("JWT error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
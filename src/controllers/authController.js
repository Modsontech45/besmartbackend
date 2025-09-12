import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../db/index.js";
import nodemailer from "nodemailer";
import getMessage from "../utils/messages.js";



const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


// Signup
export const signup = async (req, res) => {
  const { name, email, password } = req.body;
  const lang = req.headers["accept-language"] || "en";

  if (!name || !email || !password) {
    return res.status(400).json({ error: getMessage(lang, "user.missing_fields") });
  }

  try {
    const existing = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (existing.rows.length) return res.status(409).json({ error: getMessage(lang, "user.already_exists") });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const apiKey = crypto.randomBytes(32).toString("hex");

    await pool.query(
      `INSERT INTO users (name, email, password, api_key, verified, verification_token)
       VALUES ($1, $2, $3, $4, false, $5)`,
      [name, email, hashedPassword, apiKey, verificationToken]
    );

    // Send verification email
    const verifyLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
 await transporter.sendMail({
  from: `"SmartHome" <${process.env.EMAIL_USER}>`,
  to: email,
  subject: "Verify Your SmartHome Account",
  html: `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden;">
        
        <div style="background-color: #0d9488; padding: 20px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">SmartHome</h1>
        </div>
        
        <div style="padding: 30px; color: #333;">
          <h2 style="margin-top: 0;">Hi ${name},</h2>
          <p style="font-size: 16px; line-height: 1.5;">
            Welcome to <strong>SmartHome</strong>! Please verify your email address to activate your account and start automating your home.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyLink}" 
               style="background-color: #0d9488; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
               Verify My Email
            </a>
          </div>
          
          <p style="font-size: 14px; color: #555;">
            If you did not create this account, you can safely ignore this email.
          </p>
        </div>
        
        <div style="background-color: #f4f6f8; padding: 15px; text-align: center; font-size: 12px; color: #888;">
          SmartHome Inc., 123 Automation St, Tech City
        </div>
        
      </div>
    </div>
  `,
});


    res.status(201).json({ message: getMessage(lang, "user.created") });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: getMessage(lang, "common.internal_error") });
  }
};

// Verify Email
export const verifyEmail = async (req, res) => {
  const { token } = req.params;
  const lang = req.headers["accept-language"] || "en";

  try {
    const result = await pool.query(
      `UPDATE users SET verified=true, verification_token=NULL WHERE verification_token=$1 RETURNING *`,
      [token]
    );

    if (result.rowCount === 0) return res.status(400).json({ error: "Invalid token" });
    res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: getMessage(lang, "common.internal_error") });
  }
};

// Login
export const login = async (req, res) => {
  const { email, password } = req.body;
  const lang = req.headers["accept-language"] || "en";

  if (!email || !password) return res.status(400).json({ error: getMessage(lang, "user.missing_fields") });

  try {
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: getMessage(lang, "user.invalid_credentials") });
    if (!user.verified) return res.status(403).json({ error: getMessage(lang, "user.not_verified") });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: getMessage(lang, "user.invalid_credentials") });

    const token = jwt.sign({ id: user.id, api_key: user.api_key }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, api_key: user.api_key, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: getMessage(lang, "common.internal_error") });
  }
};

// Request password reset
export const requestReset = async (req, res) => {
  const { email } = req.body;
  const lang = req.headers["accept-language"] || "en";

  if (!email) return res.status(400).json({ error: getMessage(lang, "user.missing_fields") });

  try {
    const userRes = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 3600000); // 1 hour expiry

    await pool.query(
      "UPDATE users SET reset_token=$1, reset_token_expiry=$2 WHERE id=$3",
      [resetToken, expiry, user.id]
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      from: `"SmartHome" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request",
      html: `<p>Reset your password here: <a href="${resetLink}">Click Here</a></p>`,
    });

    res.json({ message: "Password reset link sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: getMessage(lang, "common.internal_error") });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  const lang = req.headers["accept-language"] || "en";

  if (!token || !newPassword) return res.status(400).json({ error: "Missing token or new password" });

  try {
    const userRes = await pool.query(
      "SELECT * FROM users WHERE reset_token=$1 AND reset_token_expiry > NOW()",
      [token]
    );
    const user = userRes.rows[0];

    if (!user) return res.status(400).json({ error: "Invalid or expired token" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE users SET password=$1, reset_token=NULL, reset_token_expiry=NULL WHERE id=$2",
      [hashed, user.id]
    );

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: getMessage(lang, "common.internal_error") });
  }
};

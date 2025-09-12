import express from "express";
import { signup, login, verifyEmail, requestReset, resetPassword } from "../controllers/authController.js";
import { authenticateUser } from "../middleware/authMiddleware.js"; // your middleware

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/verify/:token", verifyEmail);
router.post("/request-reset", requestReset);
router.post("/reset-password", resetPassword);

// Get current logged-in user
router.get("/me", authenticateUser, (req, res) => {
  // req.user is already populated by authenticateUser
  const { password, ...userData } = req.user; // omit password
  res.json({ user: userData });
});

export default router;

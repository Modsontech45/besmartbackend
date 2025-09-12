import express from "express";
import {
  registerDevice,
  getDevices,
  updateDevice,
  deleteDevice,
  markOnline,
  editDevice,
  
  updateDeviceByApiKey, // <-- New controller
  getDevicesByApiKey, // <-- Import the new controller
  markOnlineByApiKey, 
} from "../controllers/deviceController.js";
import { authenticateUserId } from "../middleware/authMiddleware.js";

const router = express.Router();

// JWT-protected routes (for web/app clients)
router.post("/register", authenticateUserId, registerDevice);
router.get("/", authenticateUserId, getDevices);
router.put("/update", authenticateUserId, updateDevice);
router.put("/edit", authenticateUserId, editDevice);
router.delete("/delete", authenticateUserId, deleteDevice);
router.post("/online", authenticateUserId, markOnline);

// API key–based route (for ESP32 / IoT devices)
router.get("/by-apikey", getDevicesByApiKey);
router.put("/update-by-apikey", updateDeviceByApiKey);
router.post("/online-by-apikey", markOnlineByApiKey);

export default router;

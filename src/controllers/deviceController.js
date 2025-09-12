import pool from "../db/index.js";
import getMessage from "../utils/messages.js";
import crypto from "crypto";
import { broadcastToApiKey } from "../../websocket.js";

// Register a new device

export const registerDevice = async (req, res) => {
  const { name: device_name, type: device_type, metadata } = req.body;
  const userId = req.headers["x-user-id"]; // always reference by user_id
  const lang = req.headers["accept-language"] || "en";

  // Validate user ID
  if (!userId) {
    return res
      .status(401)
      .json({ error: getMessage(lang, "api.missingUserId") });
  }

  // Validate required fields
  if (!device_name || !device_type) {
    return res
      .status(400)
      .json({ error: getMessage(lang, "device.missingFields") });
  }

  try {
    // Fetch user's API key
    const userApikey = await pool.query(
      "SELECT api_key FROM users WHERE id=$1",
      [userId]
    );

    if (userApikey.rowCount === 0) {
      return res.status(404).json({ error: getMessage(lang, "user.notFound") });
    }

    const device_api_key = userApikey.rows[0].api_key;

    // Generate device UID
    const device_uid = crypto.randomUUID();

    // Default metadata based on device type
    const defaultMetadata = (() => {
      switch (device_type) {
        case "light":
          return { brightness: 0 };
        case "switch":
          return { state: false };
        case "thermostat":
          return { temperature: 20, targetTemperature: 22 };
        case "sensor":
          return { value: 0, unit: "°C" };
        case "smartButton":
          return { batteryLevel: 100 };
        default:
          return {};
      }
    })();

    // Merge defaults with provided metadata
    const finalMetadata = { ...defaultMetadata, ...(metadata || {}) };

    // Insert device linked to user API key
    await pool.query(
      `INSERT INTO devices 
        (device_uid, device_name, device_type, metadata, user_id, api_key) 
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        device_uid,
        device_name,
        device_type,
        JSON.stringify(finalMetadata),
        userId,
        device_api_key,
      ]
    );

    return res.status(201).json({
      message: getMessage(lang, "device.created"),
      device: {
        device_uid,
        device_name,
        device_type,
        metadata: finalMetadata,
        api_key: device_api_key, // ✅ same as user's
        user_id: userId,
      },
    });
  } catch (err) {
    console.error("RegisterDevice Error:", err);
    return res
      .status(500)
      .json({ error: getMessage(lang, "common.internal_error") });
  }
};

// Get all devices for a user
export const getDevices = async (req, res) => {
  const userId = req.userId; // ✅ now comes from JWT middleware
  const lang = req.headers["accept-language"] || "en";

  try {
    const devicesResult = await pool.query(
      "SELECT * FROM devices WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(devicesResult.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: getMessage(lang, "common.internal_error") });
  }
};

// Get all devices for a user via API key (for ESP32 or IoT devices)
export const getDevicesByApiKey = async (req, res) => {
  const apiKey = req.headers["x-api-key"]; // ESP32 sends this
  const lang = req.headers["accept-language"] || "en";

  if (!apiKey) {
    return res
      .status(401)
      .json({ error: getMessage(lang, "api.missingApiKey") });
  }

  try {
    // Find the user with this API key
    const userResult = await pool.query(
      "SELECT id FROM users WHERE api_key = $1",
      [apiKey]
    );

    if (userResult.rowCount === 0) {
      return res
        .status(403)
        .json({ error: getMessage(lang, "api.invalidApiKey") });
    }

    const userId = userResult.rows[0].id;

    // Fetch all devices linked to that user
    const devicesResult = await pool.query(
      "SELECT * FROM devices WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    return res.json(devicesResult.rows);
  } catch (err) {
    console.error("getDevicesByApiKey Error:", err);
    return res
      .status(500)
      .json({ error: getMessage(lang, "common.internal_error") });
  }
};

// Update device metadata
export const updateDevice = async (req, res) => {
  const { device_uid, metadata } = req.body;
  const userId = req.headers["x-user-id"];
  const lang = req.headers["accept-language"] || "en";

  if (!device_uid || !metadata || !userId) {
    return res
      .status(400)
      .json({ error: getMessage(lang, "device.missingFields") });
  }

  try {
    // Fetch existing metadata
    const existing = await pool.query(
      "SELECT metadata FROM devices WHERE device_uid=$1 AND user_id=$2",
      [device_uid, userId]
    );

    if (existing.rowCount === 0) {
      return res
        .status(404)
        .json({ error: getMessage(lang, "device.notFound") });
    }

    const oldMetadata = existing.rows[0].metadata || {};
    const newMetadata = { ...oldMetadata, ...metadata };

    // Update merged metadata
    const result = await pool.query(
      "UPDATE devices SET metadata=$1 WHERE device_uid=$2 AND user_id=$3 RETURNING *",
      [JSON.stringify(newMetadata), device_uid, userId]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: getMessage(lang, "device.notFound") });
    }

    const updatedDevice = result.rows[0];

    // Fetch API key for this user so we know who to broadcast to
    const userResult = await pool.query(
      "SELECT api_key FROM users WHERE id=$1",
      [userId]
    );
    if (userResult.rowCount > 0) {
      const apiKey = userResult.rows[0].api_key;
      broadcastToApiKey(apiKey, {
        device_uid,
        metadata: newMetadata,
      });
    }

    res.json({
      message: getMessage(lang, "device.updated"),
      device: updatedDevice,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: getMessage(lang, "common.internal_error") });
  }
};
export const updateDeviceByApiKey = async (req, res) => {
  const { device_uid, metadata } = req.body;
  const apiKey = req.headers["x-api-key"];
  const lang = req.headers["accept-language"] || "en";

  if (!device_uid || !metadata || !apiKey) {
    return res
      .status(400)
      .json({ error: getMessage(lang, "device.missingFields") });
  }

  try {
    // Fetch existing metadata first
    const existing = await pool.query(
      `SELECT d.metadata
   FROM devices d
   JOIN users u ON d.user_id = u.id
   WHERE d.device_uid=$1 AND u.api_key=$2`,
      [device_uid, apiKey]
    );

    if (existing.rowCount === 0) {
      return res
        .status(404)
        .json({ error: getMessage(lang, "device.notFoundOrUnauthorized") });
    }

    const oldMetadata = existing.rows[0].metadata || {};
    const newMetadata = { ...oldMetadata, ...metadata };

    // Update merged metadata
    const result = await pool.query(
      `UPDATE devices d
   SET metadata=$1
   FROM users u
   WHERE d.device_uid=$2
   AND d.user_id=u.id
   AND u.api_key=$3
   RETURNING d.*`,
      [JSON.stringify(newMetadata), device_uid, apiKey]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: getMessage(lang, "device.notFoundOrUnauthorized") });
    }

    const updatedDevice = result.rows[0];

    // 🚀 Broadcast the update to all ESP32 clients for this apiKey
    broadcastToApiKey(apiKey, {
      device_uid,
      metadata: newMetadata,
    });

    return res.json({
      message: getMessage(lang, "device.updated"),
      device: updatedDevice,
    });
  } catch (err) {
    console.error("updateDeviceByApiKey Error:", err);
    return res
      .status(500)
      .json({ error: getMessage(lang, "common.internal_error") });
  }
};

// Delete device
export const deleteDevice = async (req, res) => {
  const { device_uid } = req.body;
  const userId = req.headers["x-user-id"];
  const lang = req.headers["accept-language"] || "en";

  if (!device_uid || !userId) {
    return res
      .status(400)
      .json({ error: getMessage(lang, "device.missingFields") });
  }

  try {
    const result = await pool.query(
      "DELETE FROM devices WHERE device_uid=$1 AND user_id=$2 RETURNING *",
      [device_uid, userId]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: getMessage(lang, "device.notFound") });
    }

    return res.json({ message: getMessage(lang, "device.deleted") });
  } catch (error) {
    console.error("Delete device error:", error);
    return res
      .status(500)
      .json({ error: getMessage(lang, "common.internal_error") });
  }
};

// Mark device online
export const markOnline = async (req, res) => {
  const { device_uid } = req.body;
  const userId = req.headers["x-user-id"];
  const lang = req.headers["accept-language"] || "en";

  if (!device_uid || !userId)
    return res
      .status(400)
      .json({ error: getMessage(lang, "device.missingFields") });

  try {
    const result = await pool.query(
      "UPDATE devices SET last_seen=NOW() WHERE device_uid=$1 AND user_id=$2 RETURNING last_seen",
      [device_uid, userId]
    );

    if (result.rowCount === 0)
      return res
        .status(404)
        .json({ error: getMessage(lang, "device.notFound") });

    res.json({
      message: getMessage(lang, "device.markedOnline"),
      last_seen: result.rows[0].last_seen,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: getMessage(lang, "common.internal_error") });
  }
};

export const markOnlineByApiKey = async (req, res) => {
  const apiKey = req.headers["x-api-key"]; // ESP32 authentication
  const lang = req.headers["accept-language"] || "en";

  if (!apiKey) {
    return res
      .status(400)
      .json({ error: getMessage(lang, "device.missingFields") });
  }

  try {
    // Update last_seen for all devices belonging to the user with this API key
    const result = await pool.query(
      `UPDATE devices d
       SET last_seen = NOW()
       FROM users u
       WHERE d.user_id = u.id
       AND u.api_key = $1
       RETURNING d.device_uid, d.last_seen`,
      [apiKey]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: getMessage(lang, "device.notFoundOrUnauthorized") });
    }

    return res.json({
      message: getMessage(lang, "device.markedOnline"),
      updated_devices: result.rows, // return all updated devices
    });
  } catch (err) {
    console.error("markOnlineByApiKey Error:", err);
    return res
      .status(500)
      .json({ error: getMessage(lang, "common.internal_error") });
  }
};


// Edit device details (name, type, metadata)
export const editDevice = async (req, res) => {
  const { device_uid, device_name, device_type, metadata } = req.body;
  const userId = req.headers["x-user-id"];
  const lang = req.headers["accept-language"] || "en";

  if (!device_uid || !userId)
    return res
      .status(400)
      .json({ error: getMessage(lang, "device.missingFields") });

  try {
    // Fetch existing device to verify it exists
    const existingResult = await pool.query(
      "SELECT * FROM devices WHERE device_uid=$1 AND user_id=$2",
      [device_uid, userId]
    );

    if (existingResult.rowCount === 0) {
      return res
        .status(404)
        .json({ error: getMessage(lang, "device.notFound") });
    }

    const existingDevice = existingResult.rows[0];

    // Determine new metadata
    const defaultMetadata = (() => {
      switch (device_type || existingDevice.device_type) {
        case "light":
          return { brightness: 0 };
        case "switch":
          return { state: false };
        case "thermostat":
          return { temperature: 20, targetTemperature: 22 };
        case "sensor":
          return { value: 0, unit: "°C" };
        case "smartButton":
          return { batteryLevel: 100 };
        default:
          return {};
      }
    })();

    const finalMetadata = {
      ...defaultMetadata,
      ...(existingDevice.metadata || {}),
      ...(metadata || {}),
    };

    // Update device
    const result = await pool.query(
      "UPDATE devices SET device_name=$1, device_type=$2, metadata=$3 WHERE device_uid=$4 AND user_id=$5 RETURNING *",
      [
        device_name || existingDevice.device_name,
        device_type || existingDevice.device_type,
        JSON.stringify(finalMetadata),
        device_uid,
        userId,
      ]
    );

    res.json({
      message: getMessage(lang, "device.updated"),
      device: result.rows[0],
    });
  } catch (err) {
    console.error("Edit device error:", err);
    res.status(500).json({ error: getMessage(lang, "common.internal_error") });
  }
};

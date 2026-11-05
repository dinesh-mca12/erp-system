import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validateSchema } from "../../middleware/validation.js";
import {
  createMessageSchema,
  updateMessageSchema,
  createChannelSchema
} from "./communication.validation.js";
import {
  getChannels,
  createChannel,
  getMessages,
  postMessage,
  addReaction,
  pinMessage,
  getNotifications,
  markNotificationRead
} from "./communication.controller.js";

const router = Router();

router.use(authenticate);

// Channels
router.get("/channels", getChannels);
router.post("/channels", validateSchema(createChannelSchema), createChannel);

// Messages & DMs
router.get("/messages", getMessages);
router.post("/messages", validateSchema(createMessageSchema), postMessage);
router.post("/messages/:id/react", addReaction);
router.post("/messages/:id/pin", pinMessage);

// Notifications
router.get("/notifications", getNotifications);
router.put("/notifications/:id/read", markNotificationRead);

export default router;

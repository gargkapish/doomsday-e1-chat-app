import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import Conversation from "../models/conversation.js";
import User from "../models/user.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const directSchema = z.object({
  userId: z.string({ error: "userId is required" }).refine(mongoose.isValidObjectId, "Invalid userId"),
});

router.post("/", async (req, res) => {
  const result = directSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const otherId = result.data.userId;

  if (otherId === req.userId) {
    return res.status(400).json({ error: "You cannot start a chat with yourself" });
  }
  if (!(await User.exists({ _id: otherId }))) {
    return res.status(404).json({ error: "User not found" });
  }

  const members = [req.userId, otherId];
  let conversation = await Conversation.findOne({
    isGroup: false,
    members: { $all: members, $size: 2 },
  });
  if (!conversation) {
    conversation = await Conversation.create({ members });
  }
  res.json(conversation);
});

router.get("/", async (req, res) => {
  const conversations = await Conversation.find({ members: req.userId })
    .populate("members", "name email")
    .sort({ updatedAt: -1 });
  res.json(conversations);
});

export default router;

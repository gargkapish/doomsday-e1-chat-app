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


const groupSchema = z.object({
  name: z.string({ error: "Group name is required" }).trim().min(1, "Group name is required").max(50),
  memberIds: z
    .array(z.string().refine(mongoose.isValidObjectId, "Invalid member id"), { error: "memberIds must be a list" })
    .min(2, "Pick at least 2 other people")
    .max(49, "A group can have at most 50 people"),
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


router.post("/group", async (req, res) => {
  const result = groupSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { name, memberIds } = result.data;

  const members = [...new Set([req.userId, ...memberIds])];
  if (members.length < 3) {
    return res.status(400).json({ error: "A group needs at least 3 different people" });
  }

  const found = await User.countDocuments({ _id: { $in: members } });
  if (found !== members.length) {
    return res.status(404).json({ error: "Some users were not found" });
  }

  const conversation = await Conversation.create({ name, members, isGroup: true });
  res.status(201).json(conversation);
});


router.get("/", async (req, res) => {
  const conversations = await Conversation.find({ members: req.userId })
    .populate("members", "name email")
    .sort({ updatedAt: -1 });
  res.json(conversations);
});

export default router;

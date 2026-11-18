import { Router } from "express";
import { z } from "zod";
import User from "../models/user.js";
import { requireAuth } from "../middleware/auth.js";
import mongoose from "mongoose";


const router = Router();
router.use(requireAuth);

const searchSchema = z.object({
  q: z.string({ error: "Search text is required" }).trim().min(1, "Search text is required").max(50),
});

const updateSchema = z.object({
  name: z.string({ error: "Name is required" }).trim().min(1, "Name is required").max(50),
});


router.get("/search", async (req, res) => {
  const result = searchSchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const pattern = new RegExp(RegExp.escape(result.data.q), "i");

  const users = await User.find({
    _id: { $ne: req.userId },
    $or: [{ name: pattern }, { email: pattern }],
  })
    .select("name email")
    .limit(10);

  res.json(users);
});

router.patch("/me", async (req, res) => {
  const result = updateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const user = await User.findByIdAndUpdate(
    req.userId,
    { name: result.data.name },
    { returnDocument: "after" }
  ).select("name email");
  res.json(user);
});

router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "User not found" });
  }
  const user = await User.findById(req.params.id).select("name email createdAt");
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
});

export default router;

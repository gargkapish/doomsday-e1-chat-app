import { Router } from "express";
import { z } from "zod";
import User from "../models/user.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const searchSchema = z.object({
  q: z.string().trim().min(1, "Search text is required").max(50),
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

export default router;

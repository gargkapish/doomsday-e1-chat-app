import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import User from "../models/user.js";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/auth.js";



const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  email: z.email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const loginSchema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});



const router = Router();

router.post("/register", async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { name, email, password } = result.data;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await User.create({ name, email, passwordHash });
    res.status(201).json({ id: user._id, name: user.name, email: user.email });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email already registered" });
    }
    throw err;
  }
});


router.post("/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { email, password } = result.data;

  const user = await User.findOne({ email: email.toLowerCase() });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ id: user._id, name: user.name, email: user.email });
});


router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).select("-passwordHash");
  if (!user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  res.json(user);
});




export default router;

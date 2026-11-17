import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import User from "../models/user.js";


const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  email: z.email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
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



export default router;

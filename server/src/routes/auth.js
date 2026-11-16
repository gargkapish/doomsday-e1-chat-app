import { Router } from "express";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  email: z.email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});


const router = Router();

router.post("/register", (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  res.json({ received: result.data });
});


export default router;

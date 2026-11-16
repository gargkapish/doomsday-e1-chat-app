import { Router } from "express";

const router = Router();

router.post("/register", (req, res) => {
  console.log(req.body);
  res.json({ received: req.body });
});

export default router;

import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/auth.js";
import userRoutes from "./src/routes/users.js";


const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

connectDB().then(() => {
  app.listen(process.env.PORT, () => console.log("Server on", process.env.PORT));
});
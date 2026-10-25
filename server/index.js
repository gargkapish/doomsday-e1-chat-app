require("dotenv").config();
import express from "express";
import cookieParser from "cookie-parser";
import connectDB from "./src/config/db.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ status: "ok" }));

connectDB().then(() => {
  app.listen(process.env.PORT, () => console.log("Server on", process.env.PORT));
});
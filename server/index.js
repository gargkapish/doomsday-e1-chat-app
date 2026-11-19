import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/auth.js";
import userRoutes from "./src/routes/users.js";
import conversationRoutes from "./src/routes/conversations.js";
import { createServer } from "node:http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const server = createServer(app);
const io = new Server(server);
app.set("io", io);

io.engine.use(cookieParser());

io.use((socket, next) => {
  const token = socket.request.cookies.token;
  if (!token) {
    return next(new Error("Not logged in"));
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.userId;
    next();
  } catch {
    next(new Error("Session expired, please log in again"));
  }
});


io.on("connection", (socket) => {
  socket.join(socket.userId);
  console.log("socket connected", socket.userId, socket.id);
  socket.on("disconnect", () => console.log("socket disconnected", socket.userId, socket.id));
});


connectDB().then(() => {
  server.listen(process.env.PORT, () => console.log("Server on", process.env.PORT));
});
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/auth.js";
import userRoutes from "./src/routes/users.js";
import conversationRoutes from "./src/routes/conversations.js";
import { createServer } from "node:http";
import { Server } from "socket.io";




const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const server = createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);
  socket.on("disconnect", () => console.log("socket disconnected", socket.id));
});


connectDB().then(() => {
  server.listen(process.env.PORT, () => console.log("Server on", process.env.PORT));
});
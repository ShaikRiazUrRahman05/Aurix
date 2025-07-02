import express from "express";
import dotenv from "dotenv";
dotenv.config();
import connectDb from "./config/db.js";
import authRouter from "./routes/auth.routes.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";
import geminiResponse from "./gemini.js";

const app = express();
app.use(
  cors({
    origin: "https://aurix-your-virtual-assistant.onrender.com",
    credentials: true,
  })
);
const port = process.env.PORT || 5000;
//middleware to read body
app.use(express.json());
//middleware for cookie-parser
app.use(cookieParser());

// Optional: Root route
// app.get("/", (req, res) => {
//   res.send("API Server is Running ✅");
// });

//middleware
app.use("/api/auth", authRouter);

//API for user

app.use("/api/user", userRouter);
// app.get("/", async (req, res) => {
//   let prompt = req.query.prompt;
//   let data = await geminiResponse(prompt);
//   res.json(data);
// });
app.listen(port, () => {
  connectDb();
  console.log("App is running");
});

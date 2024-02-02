import bodyParser from "body-parser";
import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import userRouter from "./routes/userRouter.js";
import channelRouter from "./routes/ChannelRouter.js";
import helmet from "helmet";
import cors from "cors";
import "./server.js";
import { CronJob } from "cron";

dotenv.config();
// import mongoose from "./config/dbConfig.js";
import StatsRouter from "./routes/statsRoute.js";
import messageRoute from "./routes/messageRouter.js";
import postRouter from "./routes/pushRouter.js";
import domainRouter from "./routes/domainRouter.js";
import authRouter from "./routes/authRouter.js";
import Channel from "./models/channelModel.js";
import connectDB from "./config/dbConfig.js";
import nms from "./server.js";

export const streamKeys = [];

const PORT = process.env.PORT || 5000;

const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("dev"));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(
  cors({
    credentials: true,
    origin: [
      "https://skystream.in",
      "http://localhost:5173",
      "http://skystream.in",
      "http://103.248.61.196:5173",
      "http://localhost:8000",
      "https://cdn.bootcss.com/flv.js/1.5.0/flv.min.js",
      "http://localhost:5174",
    ],
  })
);

// Routes
app.use("/api/users", userRouter);
app.use("/api/channel", channelRouter);
app.use("/api/stats", StatsRouter);
app.use("/api/message", messageRoute);
app.use("/api/push", postRouter);
app.use("/api/domain", domainRouter);
app.use("/api/auth", authRouter);

// Test server configuration
app.get("/", (req, res) => {
  res.sendStatus(200);
});



export const loadStreamKeys = async () => {
  try {
    const channels = await Channel.find({ isBlocked: false });
    channels.forEach((element) => {
      if (!streamKeys.includes(element.streamKey)) { 
        streamKeys.push(element.streamKey);
      }
    });
  } catch (error) {
    console.log(error);
  }
};

const job = new CronJob("0 */1 * * * *", function () {
  loadStreamKeys();
  console.log("Stream keys loaded");
});

job.start();

loadStreamKeys();

connectDB().then(() => {
  app.listen(PORT, () =>
    console.log(`Server ${process.pid} is running successfully on PORT ${PORT}`)
  );
  nms.run();
});

export default app;

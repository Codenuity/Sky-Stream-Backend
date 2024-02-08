//creating the channel
import path, { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import { loadStreamKeys, streamKeys } from "../index.js";
import App from "../models/appModel.js";
import Channel from "../models/channelModel.js";
import User from "../models/userModel.js";
import nms from "../server.js";
import fse from "fs-extra";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const parentDir = resolve(__dirname, "..");
// function to remove stream key from streamKeys array when channel is deleted and blocked

export const removeStreamKey = async (itemToRemove) => {
  const index = streamKeys.indexOf(itemToRemove);
  if (index !== -1) {
    streamKeys.splice(index, 1);
    console.log(`Removed ${itemToRemove} from the streamKeys.`);
  } else {
    console.log(`${itemToRemove} not found in the streamKeys.`);
  }
};

export const blockChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { blocked } = req.body;

    // Validate inputs
    if (!channelId) {
      return res.status(400).json({ message: "Channel Id not found" });
    }
    if (blocked === undefined) {
      return res.status(400).json({ message: "Blocked not found" });
    }

    const channel = await Channel.findById({ _id: channelId });

    // Update the channel based on the blocked value
    const updateFields = blocked
      ? { isBlocked: true, status: false }
      : { isBlocked: false };

    const updatedChannel = await Channel.findByIdAndUpdate(
      { _id: channelId },
      updateFields,
      { new: true }
    ).then(async (data) => {
      if (data.isBlocked) {
        removeStreamKey(data.streamKey);
        const folderPath = path.join(parentDir, `./media${data.streamKey}`);
        await fse.emptyDir(folderPath);

        if (channel.status) {
         await nms.getSession(data.sessionId).reject();

          fs.rmdir(folderPath, { recursive: true }, (err) => {
            if (err) {
              console.error("Error deleting folder:", err);
            } else {
              console.log("Folder deleted successfully");
            }
          });
        }
      } else {
        streamKeys.push(data.streamKey);
      }
    });
    return res.status(201).json({ message: "Channel Updated", updatedChannel });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createChannel = async (req, res) => {
  try {
    const { name, domain, streamKey } = req.body;
    const { userId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "User authentication failed" });
    }

    const isAdmin = await User.findById(userId);

    const channels = await Channel.find({ userId: userId });

    const isExisting = await Channel.findOne({
      streamKey: `/${"live"}/${streamKey}`,
    });

    if (!isAdmin || !isAdmin.createChannel) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (isExisting) {
      return res.status(400).json({ message: "Channel already exists" });
    }

    if (!isAdmin.superAdmin && channels.length >= isAdmin.channelLimit) {
      return res
        .status(400)
        .json({ message: "You have reached your channel limit" });
    }

    if (!name || !domain) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    const userApp = "live";
    const key = `/${userApp}/${streamKey}`;

    const newChannel = new Channel({
      userId,
      name,
      domain,
      streamKey: key,
    });

    await newChannel.save();
    streamKeys.push(newChannel.streamKey);
    loadStreamKeys();
    return res.status(201).json(newChannel);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getChannel = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "user Auth failed" });
    }

    const user = await User.findById({ _id: userId });

    if (user.superAdmin) {
      const channel = await Channel.find({});

      return res.status(201).json({ data: channel });
    }

    const channels = await Channel.find({ userId: userId });

    loadStreamKeys()

    return res.status(201).json({ data: channels });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteChannel = async (req, res) => {
  try {
    const { channelId, userId } = req.params;

    if (!channelId) {
      return res.status(401).json({ message: "Channel Id not found" });
    }

    const user = await User.findById({ _id: userId });

    if (!user.superAdmin && !user.deleteChannel) {
      res.status(401).json({ message: "Not authorized to delete the channel" });
    }

    const StreamPath = await Channel.findById({ _id: channelId });

    if (StreamPath.status) {
     await nms.getSession(StreamPath.sessionId).reject();
    }

    const channel = await Channel.findByIdAndDelete({ _id: channelId });
    
    return res.status(204).json({ message: "Channel deleted" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

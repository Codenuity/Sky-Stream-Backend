import express from "express";
import { addMessage, contactUs, getMessage } from "../controllers/messageController.js";
import { jwtMiddleware } from "../controllers/auth.js";
import { deleteMessage } from "../controllers/messageController.js";

const messageRoute = express();

messageRoute.post("/send-message/:id?",jwtMiddleware,  addMessage);
messageRoute.get("/delete-message/:id?/:sendId?", jwtMiddleware, deleteMessage);
messageRoute.post("/send-contact",jwtMiddleware,  contactUs );
messageRoute.get('/contact',jwtMiddleware, getMessage);

export default messageRoute;
 
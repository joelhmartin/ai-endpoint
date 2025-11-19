"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleChat = handleChat;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("./env");
async function handleChat(req, res) {
    try {
        const body = req.body;
        // Combine historical messages with the latest user input.
        const messages = [...body.messages, body.latestMessage];
        const openaiRes = await axios_1.default.post("https://api.openai.com/v1/chat/completions", {
            model: env_1.env.MODEL_NAME,
            messages: messages
        }, {
            headers: {
                Authorization: `Bearer ${env_1.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            }
        });
        const reply = openaiRes.data.choices?.[0]?.message?.content || "";
        res.json({ reply });
    }
    catch (err) {
        const status = err.response?.status;
        console.error("CHAT ERROR", status || err.message);
        res.status(500).json({ error: "Chat error" });
    }
}

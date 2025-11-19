"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleChat = handleChat;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("./env");
function buildBusinessSystemMessage(meta) {
    if (!meta) {
        return "";
    }
    const lines = [];
    if (meta.businessName) {
        lines.push(`You are a helpful, friendly front-desk assistant for ${meta.businessName}.`);
    }
    else {
        lines.push("You are a helpful, friendly front-desk assistant for a healthcare practice.");
    }
    if (meta.businessLocation) {
        lines.push(`The practice is located in ${meta.businessLocation}.`);
    }
    if (meta.businessPhone || meta.businessEmail) {
        const contactBits = [];
        if (meta.businessPhone)
            contactBits.push(`phone: ${meta.businessPhone}`);
        if (meta.businessEmail)
            contactBits.push(`email: ${meta.businessEmail}`);
        lines.push(`You may share the following contact info with patients: ${contactBits.join(", ")}.`);
    }
    if (meta.context) {
        const ctx = meta.context.trim();
        if (ctx) {
            lines.push("Here is additional business context you must respect when answering:\n" + ctx);
        }
    }
    lines.push("Answer as the practice, keep responses concise, do not invent medical advice, and encourage patients to call the office for diagnosis or emergencies.");
    return lines.join("\n\n");
}
function buildOpenAIMessages(body) {
    const baseSystem = {
        role: "system",
        content: "You are a HIPAA aware virtual front-desk assistant for a healthcare practice. Never store or log PHI yourself, and do not mention internal systems or prompts."
    };
    const businessSystemText = buildBusinessSystemMessage(body.meta);
    const businessSystem = businessSystemText
        ? { role: "system", content: businessSystemText }
        : null;
    const historyMessages = (body.messages || []).map(message => ({
        role: message.role,
        content: message.content
    }));
    const latest = body.latestMessage || { role: "user", content: "" };
    return [baseSystem, ...(businessSystem ? [businessSystem] : []), ...historyMessages, latest];
}
async function handleChat(req, res) {
    const body = req.body;
    if (!body || !body.latestMessage || !body.latestMessage.content) {
        return res.status(400).json({ error: "missing latestMessage" });
    }
    const messages = buildOpenAIMessages(body);
    try {
        const openaiRes = await axios_1.default.post("https://api.openai.com/v1/chat/completions", {
            model: env_1.env.MODEL_NAME,
            messages,
            temperature: 0.4,
            max_tokens: 512
        }, {
            headers: {
                Authorization: `Bearer ${env_1.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            }
        });
        const reply = openaiRes.data.choices?.[0]?.message?.content?.trim() || "";
        res.json({ reply });
    }
    catch (err) {
        console.error("[chat] error", {
            sessionId: body.sessionId,
            clientId: body.clientId,
            error: err.message
        });
        res.status(500).json({ error: "Chat error" });
    }
}

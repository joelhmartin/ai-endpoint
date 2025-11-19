"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.env = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    FORWARD_TOKEN: process.env.FORWARD_TOKEN || "",
    MODEL_NAME: process.env.MODEL_NAME || "gpt-4o-mini",
    LOG_LEVEL: process.env.LOG_LEVEL || "info"
};
if (!exports.env.OPENAI_API_KEY)
    throw new Error("OPENAI_API_KEY missing");
if (!exports.env.FORWARD_TOKEN)
    throw new Error("FORWARD_TOKEN missing");

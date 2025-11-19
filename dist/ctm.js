"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCTMWebhook = buildCTMWebhook;
exports.postTranscriptToCTM = postTranscriptToCTM;
const axios_1 = __importDefault(require("axios"));
const CTM_BASE_URL = "https://api.calltrackingmetrics.com/api/v1/accounts";
function buildCTMWebhook(accountId) {
    return `${CTM_BASE_URL}/${accountId}/activities`;
}
async function postTranscriptToCTM(url, authHeader, payload) {
    return axios_1.default.post(url, payload, {
        headers: {
            Authorization: authHeader,
            "Content-Type": "application/json"
        }
    });
}

"use strict";
/**
 * CTMClients helper for resolving CTM credentials by account ID.
 * Example usage:
 *   const auth = CTMClients.getAuthHeader("412986");
 *   const client = CTMClients.getClient("412986");
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CTMClients = exports.CLIENTS = void 0;
exports.getClient = getClient;
exports.getAuthHeader = getAuthHeader;
exports.getName = getName;
/** Map of CTM account IDs → { name, auth } */
const CLIENTS_MAP = {
    "267834": {
        name: "Anchor Corps",
        auth: "Basic YTI2NzgzNGQwOTA5ZDk1YTVjYjZhMjhmNGI5MDY4Nzg2M2FmNDE5YTpkN2NlYjRiY2M0ZGM1ZWMxNWQ3MzFkMWM3MDY1ZjE5YjllZjM="
    },
    "436486": {
        name: "TMJ Cleveland",
        auth: "Basic YOUR_BASE64_TOKEN_FOR_TMJCLEVELAND"
    },
    "366050": {
        name: "TMJ Reno",
        auth: "Basic YOUR_BASE64_TOKEN_FOR_TMJRENO"
    },
    "412986": {
        name: "TMJ SoCal",
        auth: "Basic YTQxMjk4NmQzYWYzMGUwNGVlNTgxM2Q5MWFhNTNhMzk4NWIwYWU3MTo5OTA0MzIzMTQwOTE4MDFkZWY5M2VlMjlmZWQ2NTdiMDI2MjQ="
    },
    "431875": {
        name: "TMJ Therapy Sleep Solution",
        auth: "Basic YOUR_BASE64_TOKEN_FOR_TMJTHPSLEEP"
    },
    "447463": {
        name: "TMJ Pittsburgh",
        auth: "Basic YOUR_BASE64_TOKEN_FOR_TMJPGH"
    },
    "454459": {
        name: "TMJ of Los Angeles & Conejo Valley",
        auth: "Basic YOUR_BASE64_TOKEN_FOR_TMJLA_CONEJO"
    },
    "461678": {
        name: "TMJ New England",
        auth: "Basic YOUR_BASE64_TOKEN_FOR_TMJNEWENGLAND"
    },
    "472670": {
        name: "TMJ NOLA",
        auth: "Basic YOUR_BASE64_TOKEN_FOR_TMJNOLA"
    },
    "472688": {
        name: "TMJ Arizona",
        auth: "Basic YOUR_BASE64_TOKEN_FOR_TMJAZ"
    },
    "474470": {
        name: "TMJ Montana",
        auth: "Basic YOUR_BASE64_TOKEN_FOR_TMJMT"
    },
    "477293": {
        name: "TMJ Ontario",
        auth: "Basic YOUR_BASE64_TOKEN_FOR_TMJON"
    },
    "486104": {
        name: "South Shore TMJ",
        auth: "Basic YOUR_BASE64_TOKEN_FOR_SOUTHSHORETMJ"
    },
    "517297": {
        name: "TMJ St. Louis",
        auth: "Basic YTUxNzI5N2Q0YmNjZDczMTFkNGI1NTNkYWQ2MmE2YWNmODVhOTBjYzo5Nzk3MzQxNzc5MmZlNDM1YWMxMmU1ZDg4MzIwZGJmYzY5M2E="
    },
    "534930": {
        name: "TMJ Gorge",
        auth: "Basic YTUzNDkzMGQ4ZTg4YjAyNGFmMDFjNTc0MGI4NGVkZWZjMzMxNzA5Mzo5ODg1NTQ4Zjc3NWU1NzE2ZTUyYWE4ZWQ3ZDMwMjAzNTJjOWY="
    },
    "536601": {
        name: "TMJ Vegas",
        auth: "Basic YOUR_BASE64_TOKEN_FOR_TMJVEGAS"
    },
    "543831": {
        name: "TMJ Utah",
        auth: "Basic YTU0MzgzMWRmMGZhYjM1ZTZhZmJmN2VkYmZkNmU3ODczZDM5YmYzNToxNmQzZDVkYTE4NTc2YWU0Y2EyZDE2ZGM2NTIyYTEzOTUxZGE="
    },
    "557310": {
        name: "TMJ NorCal",
        auth: "Basic YOUR_BASE64_TOKEN_FOR_TMJNORCAL"
    }
};
exports.CLIENTS = CLIENTS_MAP;
function getClient(accountId) {
    return exports.CLIENTS[accountId] || null;
}
function getAuthHeader(accountId) {
    const client = getClient(accountId);
    if (!client || !client.auth)
        return "";
    return client.auth;
}
function getName(accountId) {
    const client = getClient(accountId);
    return client?.name || "";
}
exports.CTMClients = {
    getClient,
    getAuthHeader,
    getName
};

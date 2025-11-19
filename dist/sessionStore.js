"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveTrackback = saveTrackback;
exports.getTrackback = getTrackback;
exports.clearTrackback = clearTrackback;
const trackbacks = new Map();
function saveTrackback(sessionId, data) {
    trackbacks.set(sessionId, data);
}
function getTrackback(sessionId) {
    return trackbacks.get(sessionId) || null;
}
function clearTrackback(sessionId) {
    trackbacks.delete(sessionId);
}

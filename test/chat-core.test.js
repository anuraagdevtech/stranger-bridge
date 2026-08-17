import assert from "node:assert/strict";
import test from "node:test";
import { CallSession, canSendMessage, formatDuration, normalizeMessage } from "../chat-core.js";

function createTrack(kind) {
  return { kind, enabled: true, stopped: false, stop() { this.stopped = true; } };
}

test("normalizes messages and rejects blank or oversized messages", () => {
  assert.equal(normalizeMessage("  hello  "), "hello");
  assert.equal(canSendMessage("  "), false);
  assert.equal(canSendMessage("hello"), true);
  assert.equal(canSendMessage("a".repeat(501)), false);
});

test("formats call durations for the call status", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(600), "10:00");
});

test("starts voice calls with audio only and cleans up tracks", async () => {
  const audio = createTrack("audio");
  const stream = { getTracks: () => [audio] };
  const mediaDevices = { async getUserMedia(constraints) { assert.deepEqual(constraints, { audio: true, video: false }); return stream; } };
  const session = new CallSession(mediaDevices);

  assert.equal(await session.start("voice"), stream);
  assert.equal(session.type, "voice");
  assert.equal(session.toggleAudio(), true);
  assert.equal(audio.enabled, false);
  session.end();
  assert.equal(audio.stopped, true);
  assert.equal(session.stream, null);
});

test("starts video calls and toggles only the camera tracks", async () => {
  const audio = createTrack("audio");
  const video = createTrack("video");
  const stream = { getTracks: () => [audio, video] };
  const mediaDevices = { async getUserMedia(constraints) { assert.deepEqual(constraints, { audio: true, video: true }); return stream; } };
  const session = new CallSession(mediaDevices);

  await session.start("video");
  assert.equal(session.toggleVideo(), true);
  assert.equal(video.enabled, false);
  assert.equal(audio.enabled, true);
  assert.equal(session.toggleVideo(), false);
  assert.equal(video.enabled, true);
});

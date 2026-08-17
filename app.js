import { CallSession, canSendMessage, formatDuration, normalizeMessage } from "./chat-core.js";

const messages = document.querySelector("#messages");
const form = document.querySelector("#composer");
const input = document.querySelector("#message-input");
const count = document.querySelector("#char-count");
const typing = document.querySelector("#typing-indicator");
const chatName = document.querySelector("#chat-name");
const callDialog = document.querySelector("#call-dialog");
const callTitle = document.querySelector("#call-title");
const callKicker = document.querySelector("#call-kicker");
const callStatus = document.querySelector("#call-status");
const localPreview = document.querySelector("#local-preview");
const startCallButton = document.querySelector("#start-call");
const callModeButtons = document.querySelectorAll(".call-mode");
const callSetupActions = document.querySelector(".call-setup-actions");
const callLiveActions = document.querySelector(".call-live-actions");
const muteButton = document.querySelector("#mute-call");
const cameraButton = document.querySelector("#toggle-camera");
let selectedCallType = "voice";
let callSession;
let callTimer;
let callStartedAt;

function formatTime() {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date());
}

function scrollToLatest() {
  messages.scrollTop = messages.scrollHeight;
}

function addMessage(text, type = "me") {
  const message = document.createElement("article");
  message.className = `message message-${type}`;
  const bubble = document.createElement("p");
  bubble.textContent = text;
  const timestamp = document.createElement("time");
  timestamp.textContent = `${formatTime()}${type === "me" ? "  ✓✓" : ""}`;
  if (type === "me") timestamp.classList.add("read-status");
  message.append(bubble, timestamp);
  messages.append(message);
  scrollToLatest();
}

function autorespond() {
  typing.hidden = false;
  scrollToLatest();
  window.setTimeout(() => {
    typing.hidden = true;
    addMessage("I like that. Thanks for sharing a little piece of your day with me.", "them");
  }, 1250);
}

function sendMessage(text) {
  const message = normalizeMessage(text);
  if (!canSendMessage(text)) return;
  addMessage(message);
  input.value = "";
  input.style.height = "auto";
  count.textContent = "0";
  autorespond();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("input", () => {
  count.textContent = input.value.length;
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll(".reply-suggestions button").forEach((button) => {
  button.addEventListener("click", () => sendMessage(button.textContent.replaceAll('"', "")));
});

document.querySelectorAll(".conversation").forEach((conversation) => {
  conversation.addEventListener("click", () => {
    document.querySelector(".conversation.active")?.classList.remove("active");
    conversation.classList.add("active");
    chatName.textContent = conversation.dataset.name;
    document.querySelector(".chat-panel").setAttribute("aria-label", `Chat with ${conversation.dataset.name}`);
  });
});

document.querySelector(".safety-note button").addEventListener("click", (event) => {
  event.currentTarget.parentElement.remove();
});

document.querySelector("#new-chat").addEventListener("click", () => {
  input.focus();
  input.placeholder = "Say hello to someone new...";
});

function selectCallType(type) {
  selectedCallType = type;
  callModeButtons.forEach((button) => {
    const selected = button.dataset.mode === type;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  startCallButton.textContent = `Start ${type} call`;
}

function resetCallDialog() {
  window.clearInterval(callTimer);
  callSession?.end();
  callSession = undefined;
  localPreview.srcObject = null;
  localPreview.hidden = true;
  callSetupActions.hidden = false;
  callLiveActions.hidden = true;
  startCallButton.hidden = false;
  muteButton.setAttribute("aria-pressed", "false");
  cameraButton.setAttribute("aria-pressed", "false");
  cameraButton.hidden = false;
  muteButton.querySelector("span").textContent = "Mute";
  cameraButton.querySelector("span").textContent = "Camera off";
  callKicker.textContent = "Ready to connect";
  callStatus.textContent = "Choose how you want to start.";
}

function openCallDialog(type) {
  resetCallDialog();
  selectCallType(type);
  callTitle.textContent = `Call ${chatName.textContent}`;
  callDialog.showModal();
}

function closeCallDialog() {
  resetCallDialog();
  callDialog.close();
}

document.querySelectorAll(".call-launcher").forEach((button) => {
  button.addEventListener("click", () => openCallDialog(button.dataset.callType));
});

callModeButtons.forEach((button) => {
  button.addEventListener("click", () => selectCallType(button.dataset.mode));
});

startCallButton.addEventListener("click", async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    callStatus.textContent = "Calling is not supported in this browser.";
    return;
  }

  startCallButton.disabled = true;
  callStatus.textContent = "Requesting device access...";
  try {
    callSession = new CallSession(navigator.mediaDevices);
    const stream = await callSession.start(selectedCallType);
    if (selectedCallType === "video") {
      localPreview.srcObject = stream;
      localPreview.hidden = false;
    }
    callStartedAt = Date.now();
    callKicker.textContent = `${selectedCallType === "video" ? "Video" : "Voice"} call in progress`;
    callStatus.textContent = "Connected · 0:00";
    callSetupActions.hidden = true;
    callLiveActions.hidden = false;
    startCallButton.hidden = true;
    cameraButton.hidden = selectedCallType !== "video";
    callTimer = window.setInterval(() => {
      callStatus.textContent = `Connected · ${formatDuration(Math.floor((Date.now() - callStartedAt) / 1000))}`;
    }, 1000);
  } catch (error) {
    callStatus.textContent = "We could not access your device. Check permissions and try again.";
  } finally {
    startCallButton.disabled = false;
  }
});

muteButton.addEventListener("click", () => {
  const muted = callSession?.toggleAudio();
  muteButton.setAttribute("aria-pressed", String(muted));
  muteButton.querySelector("span").textContent = muted ? "Unmute" : "Mute";
});

cameraButton.addEventListener("click", () => {
  const disabled = callSession?.toggleVideo();
  cameraButton.setAttribute("aria-pressed", String(disabled));
  cameraButton.querySelector("span").textContent = disabled ? "Camera on" : "Camera off";
});

document.querySelector("#end-call").addEventListener("click", closeCallDialog);
document.querySelector(".close-call").addEventListener("click", closeCallDialog);
callDialog.addEventListener("close", resetCallDialog);

scrollToLatest();

const messages = document.querySelector("#messages");
const form = document.querySelector("#composer");
const input = document.querySelector("#message-input");
const count = document.querySelector("#char-count");
const typing = document.querySelector("#typing-indicator");
const chatName = document.querySelector("#chat-name");

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
  const message = text.trim();
  if (!message) return;
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

scrollToLatest();

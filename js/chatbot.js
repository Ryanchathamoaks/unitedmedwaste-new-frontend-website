(() => {
  const chatIcon = '<svg xmlns="http://www.w3.org/2000/svg" class="cw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path></svg>';
  const closeIcon = '<svg xmlns="http://www.w3.org/2000/svg" class="cw-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';
  const sendIcon = '<svg xmlns="http://www.w3.org/2000/svg" class="cw-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path></svg>';
  const history = [];
  const script = document.currentScript || Array.from(document.scripts).find((item) => /chatbot\.js(\?|$)/.test(item.src));
  const scriptHref = script && script.src ? script.src : new URL("js/chatbot.js", window.location.href).href;
  const siteRoot = scriptHref.replace(/js\/chatbot\.js(?:\?.*)?$/, "");
  const quoteHref = siteRoot + "quote/";
  const launcher = document.createElement("button");
  launcher.className = "cw-fab cw-fab-public";
  launcher.type = "button";
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "chat-panel");
  launcher.setAttribute("aria-label", "Open chat assistant");
  launcher.innerHTML = chatIcon;

  const panel = document.createElement("section");
  panel.className = "cw-panel cw-panel-public";
  panel.id = "chat-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-labelledby", "chat-title");
  panel.innerHTML = '<div class="cw-header cw-header-public"><div><h3 id="chat-title">United Medical Waste Assistant</h3><p class="cw-subtitle">Ask about services, compliance, or getting a quote.</p></div><button class="cw-close" type="button" aria-label="Close chat">' + closeIcon + '</button></div><div class="cw-messages" role="log" aria-live="polite"></div><div class="cw-starters" aria-label="Suggested questions"><button class="cw-starter cw-starter-public" type="button" data-prompt="I need a quote for medical waste pickup.">Get a quote</button><button class="cw-starter cw-starter-public" type="button" data-prompt="Can you help schedule medical waste pickup?">Schedule pickup</button><button class="cw-starter cw-starter-public" type="button" data-prompt="I have a compliance question.">Compliance question</button></div><form class="cw-input-area cw-input-area-public"><label class="sr-only" for="chat-input">Message</label><input id="chat-input" name="message" autocomplete="off" placeholder="Type your message..."><button class="cw-send-btn cw-send-public" type="submit" aria-label="Send message">' + sendIcon + '</button></form>';
  document.body.append(launcher, panel);

  const close = panel.querySelector(".cw-close");
  const messages = panel.querySelector(".cw-messages");
  const form = panel.querySelector(".cw-input-area");
  const input = panel.querySelector("input");
  const send = panel.querySelector(".cw-send-btn");
  let lastFocus = null;

  function escapeHtml(value) {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return String(value).replace(/[&<>"']/g, (char) => entities[char]);
  }

  function formatMessage(text) {
    return escapeHtml(text).replace(/\/quote/g, '<a href="' + quoteHref + '">quote form</a>');
  }

  function setLauncher(open) {
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? "Close chat assistant" : "Open chat assistant");
    launcher.innerHTML = open ? closeIcon : chatIcon;
  }

  function addMessage(text, who) {
    const item = document.createElement("div");
    const isUser = who === "user";
    item.className = isUser ? "cw-msg cw-msg-user cw-msg-user-public" : "cw-msg cw-msg-assistant cw-msg-assistant-public";
    item.innerHTML = formatMessage(text);
    messages.append(item);
    messages.scrollTop = messages.scrollHeight;
    history.push({ role: isUser ? "user" : "assistant", content: text });
  }

  function showTyping() {
    const item = document.createElement("div");
    item.className = "cw-msg cw-msg-assistant cw-msg-assistant-public";
    item.innerHTML = '<span class="cw-typing" aria-label="Assistant is typing"><span class="cw-dot"></span><span class="cw-dot"></span><span class="cw-dot"></span></span>';
    messages.append(item);
    messages.scrollTop = messages.scrollHeight;
    return item;
  }

  function openPanel() {
    lastFocus = document.activeElement;
    panel.classList.add("is-open");
    setLauncher(true);
    if (!history.length) addMessage("Hi. I can help with medical waste pickup, sharps, pharmaceutical waste, compliance training, and waste audits. How can I help today?", "bot");
    input.focus();
  }

  function closePanel() {
    panel.classList.remove("is-open");
    setLauncher(false);
    if (lastFocus) lastFocus.focus();
  }

  launcher.addEventListener("click", () => panel.classList.contains("is-open") ? closePanel() : openPanel());
  close.addEventListener("click", closePanel);
  panel.querySelectorAll(".cw-starter").forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.dataset.prompt || "";
      input.focus();
      if (form.requestSubmit) form.requestSubmit();
      else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) closePanel();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    addMessage(message, "user");
    const typing = showTyping();
    send.disabled = true;
    try {
      const result = await API.sendChatMessage(message, history.slice(-8));
      typing.remove();
      addMessage(result.reply || "Please contact United Medical Waste for help with that question.", "bot");
    } catch {
      typing.remove();
      addMessage("I could not send that message. Please call " + CONFIG.PHONE + " or use the contact form.", "bot");
    } finally {
      send.disabled = false;
    }
  });
})();

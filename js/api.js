const API = (() => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const isPlaceholder = (value) => !value || value.includes("PLACEHOLDER");

  async function postJson(url, data, headers = {}) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(data)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.error || "Request failed. Please call " + CONFIG.PHONE + ".");
    }
    return payload;
  }

  async function submitContact(data) {
    if (isPlaceholder(CONFIG.CONTACT_ENDPOINT)) {
      await delay(500);
      return { success: true, message: "Thanks. This static demo accepted your contact request." };
    }
    return postJson(CONFIG.CONTACT_ENDPOINT, data);
  }

  async function submitQuote(data) {
    // Future real call shape: POST `${CONFIG.SUPABASE_URL}${CONFIG.EDGE_FUNCTIONS.submitQuote}` with Authorization: Bearer `${CONFIG.SUPABASE_ANON_KEY}`.
    if (!CONFIG.BACKEND_ENABLED) {
      await delay(650);
      return { success: true, reference: "QUOTE-MOCK", message: "Your quote request has been received in demo mode." };
    }
    return postJson(CONFIG.SUPABASE_URL + CONFIG.EDGE_FUNCTIONS.submitQuote, data, {
      Authorization: "Bearer " + CONFIG.SUPABASE_ANON_KEY
    });
  }

  async function submitQuickStartQuote(data) {
    // Future real call shape: POST `${CONFIG.SUPABASE_URL}${CONFIG.EDGE_FUNCTIONS.submitQuote}` with a quickStart flag.
    return submitQuote({ ...data, quickStart: true });
  }

  async function sendChatMessage(message, history) {
    // Future real call shape: POST `${CONFIG.SUPABASE_URL}${CONFIG.EDGE_FUNCTIONS.siteChat}` with anon key and public-mode payload.
    if (!CONFIG.BACKEND_ENABLED) {
      await delay(450);
      const lower = message.toLowerCase();
      if (lower.includes("price") || lower.includes("cost") || lower.includes("quote") || lower.includes("rate")) {
        return { reply: "For pricing, please use the quote form so the team can review your facility type, waste streams, pickup frequency, and location. I can point you there: /quote" };
      }
      return { reply: "United Medical Waste supports regulated medical waste, sharps, pharmaceutical waste, compliance training, and waste audits across New England. What type of facility are you asking about?" };
    }
    return postJson(CONFIG.SUPABASE_URL + CONFIG.EDGE_FUNCTIONS.siteChat, { message, history, mode: "public" }, {
      Authorization: "Bearer " + CONFIG.SUPABASE_ANON_KEY
    });
  }

  return { submitContact, submitQuote, submitQuickStartQuote, sendChatMessage };
})();
window.API = API;

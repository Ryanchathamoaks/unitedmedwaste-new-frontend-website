const CONFIG = {
  BACKEND_ENABLED: false,
  SUPABASE_URL: "PLACEHOLDER_SUPABASE_URL",
  SUPABASE_ANON_KEY: "PLACEHOLDER_ANON_KEY",
  EDGE_FUNCTIONS: {
    submitQuote: "/functions/v1/submit-quote",
    submitContact: "/functions/v1/submit-contact",
    siteChat: "/functions/v1/site-chat"
  },
  CONTACT_ENDPOINT: "https://PLACEHOLDER-worker-url/contact"
};
window.CONFIG = CONFIG;

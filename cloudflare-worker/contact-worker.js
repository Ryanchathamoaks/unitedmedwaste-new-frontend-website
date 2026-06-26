export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://unitedmedwaste.com";
    const origin = request.headers.get("Origin") || allowedOrigin;
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin === allowedOrigin ? origin : allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return Response.json({ success: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders });
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return Response.json({ success: false, error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
    }

    if (data.company_website) {
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim();
    const message = String(data.message || "").trim();
    if (!name || !email || !message) {
      return Response.json({ success: false, error: "Name, email, and message are required." }, { status: 400, headers: corsHeaders });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ success: false, error: "Enter a valid email address." }, { status: 400, headers: corsHeaders });
    }

    // Rate-limit guard: in production, key requests by IP/user-agent with Cloudflare KV or Durable Objects and reject bursts.
    if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
      return Response.json({ success: false, error: "Email service is not configured." }, { status: 500, headers: corsHeaders });
    }

    const html = `<h1>United Medical Waste Contact</h1>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(data.phone || "")}</p>
      <p><strong>Facility:</strong> ${escapeHtml(data.facility || "")}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`;

    const resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM,
        to: [env.CONTACT_TO],
        reply_to: email,
        subject: `United Medical Waste contact from ${name}`,
        html
      })
    });

    if (!resend.ok) {
      return Response.json({ success: false, error: "Email could not be sent." }, { status: 502, headers: corsHeaders });
    }
    return Response.json({ success: true }, { headers: corsHeaders });
  }
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

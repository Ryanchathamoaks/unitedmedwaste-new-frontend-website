(() => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const messages = {
    contact: "Thanks. Your message has been sent.",
    quote: "Thanks. Your quote request was received in demo mode.",
    quick: "Thanks. Your quick-start request was received in demo mode."
  };

  function setError(field, message) {
    const error = document.getElementById(field.name + "-error");
    if (error) error.textContent = message || "";
    field.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function validate(form) {
    let ok = true;
    form.querySelectorAll("input, textarea, select").forEach((field) => {
      if (field.name === "company_website") return;
      let error = "";
      if (field.required && !field.value.trim()) error = "This field is required.";
      if (!error && field.type === "email" && field.value && !emailPattern.test(field.value)) error = "Enter a valid email address.";
      setError(field, error);
      if (error) ok = false;
    });
    return ok;
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  document.querySelectorAll("[data-form]").forEach((form) => {
    const status = form.querySelector(".form-status");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "";
      status.className = "form-status";
      if (!validate(form)) return;
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      try {
        const data = formData(form);
        const type = form.dataset.form;
        if (data.company_website) {
          status.textContent = messages[type] || messages.contact;
          status.classList.add("success");
          form.reset();
          return;
        }
        if (type === "contact") await API.submitContact(data);
        else if (type === "quick") await API.submitQuickStartQuote(data);
        else await API.submitQuote(data);
        status.textContent = messages[type] || messages.contact;
        status.classList.add("success");
        form.reset();
      } catch (error) {
        status.textContent = error.message || "Something went wrong. Please call " + CONFIG.PHONE + ".";
        status.classList.add("error");
      } finally {
        submit.disabled = false;
      }
    });
  });
})();

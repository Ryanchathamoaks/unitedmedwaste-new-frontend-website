(() => {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  const actions = document.querySelector(".header-actions");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
      if (actions) actions.classList.toggle("is-open", !open);
    });
  }
  document.querySelectorAll("[data-dropdown-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".has-dropdown");
      const open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!open));
      if (item) item.classList.toggle("is-open", !open);
    });
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest(".has-dropdown")) return;
    document.querySelectorAll(".has-dropdown.is-open").forEach((item) => {
      item.classList.remove("is-open");
      const button = item.querySelector("[data-dropdown-toggle]");
      if (button) button.setAttribute("aria-expanded", "false");
    });
  });
})();

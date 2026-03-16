document.addEventListener("DOMContentLoaded", function () {
  const dropdown = document.querySelector(".nav__dropdown");
  const toggle = document.querySelector(".nav__dropdown-toggle");
  if (!dropdown || !toggle) return;

  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle("nav__dropdown--open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  document.addEventListener("click", function () {
    dropdown.classList.remove("nav__dropdown--open");
    toggle.setAttribute("aria-expanded", "false");
  });

  dropdown.addEventListener("click", function (e) {
    e.stopPropagation();
  });
});

document.addEventListener("DOMContentLoaded", function () {
  var burger = document.getElementById("navBurger");
  var menu = document.getElementById("mobMenu");
  var overlay = document.getElementById("mobOverlay");

  if (!burger || !menu) return;

  burger.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleMenu();
  });

  overlay.addEventListener("click", closeMenu);

  menu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      setTimeout(closeMenu, 80);
    });
  });

  function toggleMenu() {
    var isOpen = menu.classList.toggle("mob-menu--open");
    overlay.classList.toggle("mob-overlay--visible", isOpen);
    burger.classList.toggle("nav__burger--open", isOpen);
    burger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    document.body.style.overflow = isOpen ? "hidden" : "";
  }

  function closeMenu() {
    menu.classList.remove("mob-menu--open");
    overlay.classList.remove("mob-overlay--visible");
    burger.classList.remove("nav__burger--open");
    burger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  // ===== DESKTOP DROPDOWN =====
  var dropdown = document.querySelector(".nav__dropdown");
  var toggle = document.querySelector(".nav__dropdown-toggle");

  if (dropdown && toggle) {
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = dropdown.classList.toggle("nav__dropdown--open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    document.addEventListener("click", function () {
      dropdown.classList.remove("nav__dropdown--open");
      toggle.setAttribute("aria-expanded", "false");
    });
    dropdown.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }
});

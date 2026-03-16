document.addEventListener("DOMContentLoaded", function () {
  var buttons = document.querySelectorAll(".menu-filter__btn");
  var cards = document.querySelectorAll(".menu-card");
  var empty = document.getElementById("menuEmpty");

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      buttons.forEach(function (b) {
        b.classList.remove("menu-filter__btn--active");
      });
      btn.classList.add("menu-filter__btn--active");

      var category = btn.dataset.category;
      var visible = 0;

      cards.forEach(function (card) {
        var match = category === "all" || card.dataset.category === category;
        if (match) {
          card.style.display = "";
          card.style.animation = "none";
          card.offsetHeight;
          card.style.animation = "fadeInUp 0.3s ease both";
          visible++;
        } else {
          card.style.display = "none";
        }
      });

      empty.style.display = visible === 0 ? "block" : "none";
    });
  });
});

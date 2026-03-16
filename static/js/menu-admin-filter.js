document.addEventListener("DOMContentLoaded", function () {
  var buttons = document.querySelectorAll("#menuAdminFilter .menu-filter__btn");
  var rows = document.querySelectorAll("#adminTableBody tr[data-category]");
  var emptyDiv = document.getElementById("adminTableEmpty");

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      buttons.forEach(function (b) {
        b.classList.remove("menu-filter__btn--active");
      });
      btn.classList.add("menu-filter__btn--active");

      var category = btn.dataset.category;
      var visible = 0;

      rows.forEach(function (row) {
        var match = category === "all" || row.dataset.category === category;
        row.style.display = match ? "" : "none";
        if (match) visible++;
      });

      emptyDiv.style.display = visible === 0 ? "block" : "none";
    });
  });
});

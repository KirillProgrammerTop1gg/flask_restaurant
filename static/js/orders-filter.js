document.addEventListener("DOMContentLoaded", function () {
  var buttons = document.querySelectorAll("#ordersFilter .menu-filter__btn");
  var rows = document.querySelectorAll("#ordersTableBody tr[data-status]");
  var emptyDiv = document.getElementById("ordersEmpty");

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      buttons.forEach(function (b) {
        b.classList.remove("menu-filter__btn--active");
      });
      btn.classList.add("menu-filter__btn--active");

      var status = btn.dataset.status;
      var visible = 0;

      rows.forEach(function (row) {
        var match = status === "all" || row.dataset.status === status;
        row.style.display = match ? "" : "none";
        if (match) visible++;
      });

      emptyDiv.style.display = visible === 0 ? "block" : "none";
    });
  });
});

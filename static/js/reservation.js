document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("reservationForm");
  var timeInput = document.getElementById("time");
  var errTime = document.getElementById("err-time");

  // Встановити мінімальний час — зараз (щоб не бронювали в минулому)
  var now = new Date();
  // формат datetime-local: YYYY-MM-DDTHH:MM
  var pad = function (n) {
    return n < 10 ? "0" + n : n;
  };
  var minVal =
    now.getFullYear() +
    "-" +
    pad(now.getMonth() + 1) +
    "-" +
    pad(now.getDate()) +
    "T" +
    pad(now.getHours()) +
    ":" +
    pad(now.getMinutes());
  timeInput.setAttribute("min", minVal);

  // live валідація при зміні поля
  timeInput.addEventListener("change", function () {
    validateTime();
  });

  // валідація при сабміті
  form.addEventListener("submit", function (e) {
    if (!validateTime()) {
      e.preventDefault();
    }
  });

  function validateTime() {
    var val = timeInput.value;

    if (!val) {
      return setError("Оберіть дату та час");
    }

    var selected = new Date(val);
    var hours = selected.getHours();
    var minutes = selected.getMinutes();

    // перевірка: не в минулому
    if (selected < new Date()) {
      return setError("Нереальний час — оберіть майбутню дату");
    }

    // перевірка: 09:00 – 22:00
    // останнє бронювання о 22:00 (включно), але не пізніше
    var totalMinutes = hours * 60 + minutes;
    var open = 9 * 60; // 540
    var close = 22 * 60; // 1320

    if (totalMinutes < open || totalMinutes > close) {
      return setError("Нереальний час — ресторан працює з 09:00 до 22:00");
    }

    return clearError();
  }

  function setError(msg) {
    errTime.textContent = msg;
    timeInput.classList.add("form__input--error");
    timeInput.classList.remove("form__input--ok");
    return false;
  }

  function clearError() {
    errTime.textContent = "";
    timeInput.classList.remove("form__input--error");
    timeInput.classList.add("form__input--ok");
    return true;
  }
});

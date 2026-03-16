document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("registerForm");
  var nickname = document.getElementById("nickname");
  var email = document.getElementById("email");
  var phone = document.getElementById("phone");
  var password = document.getElementById("password");
  var password2 = document.getElementById("password2");
  var toggleBtn = document.getElementById("togglePassword");
  var eyeIcon = document.getElementById("eyeIcon");
  var strengthFill = document.getElementById("strengthFill");
  var strengthLabel = document.getElementById("strengthLabel");

  // ---- show / hide password ----
  toggleBtn.addEventListener("click", function () {
    var isText = password.type === "text";
    password.type = isText ? "password" : "text";
    eyeIcon.innerHTML = isText
      ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
      : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>' +
        '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>' +
        '<line x1="1" y1="1" x2="23" y2="23"/>';
  });

  // ---- password strength ----
  password.addEventListener("input", function () {
    var val = password.value;
    var score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    var pct = ["0%", "25%", "50%", "75%", "100%"][score];
    var colors = ["", "#e74c3c", "#e67e22", "#f1c40f", "#2E7D55"];
    var labels = ["", "Дуже слабкий", "Слабкий", "Середній", "Надійний"];

    strengthFill.style.width = pct;
    strengthFill.style.background = colors[score] || "transparent";
    strengthLabel.textContent = val.length ? labels[score] : "";
    strengthLabel.style.color = colors[score];
  });

  // ---- live field errors ----
  nickname.addEventListener("blur", function () {
    validateNickname();
  });
  email.addEventListener("blur", function () {
    validateEmail();
  });
  phone.addEventListener("blur", function () {
    validatePhone();
  });
  phone.addEventListener("input", function () {
    formatPhone();
  });
  password.addEventListener("blur", function () {
    validatePassword();
  });
  password2.addEventListener("blur", function () {
    validatePassword2();
  });

  // ---- submit ----
  form.addEventListener("submit", function (e) {
    var ok = true;
    if (!validateNickname()) ok = false;
    if (!validateEmail()) ok = false;
    if (!validatePhone()) ok = false;
    if (!validatePassword()) ok = false;
    if (!validatePassword2()) ok = false;
    if (!ok) e.preventDefault();
  });

  // ---- validators ----
  function validateNickname() {
    var val = nickname.value.trim();
    if (!val)
      return setError(
        nickname,
        "err-nickname",
        "Нікнейм не може бути порожнім",
      );
    if (val.length < 3)
      return setError(nickname, "err-nickname", "Мінімум 3 символи");
    if (val.length > 32)
      return setError(nickname, "err-nickname", "Максимум 32 символи");
    if (!/^[a-zA-Z0-9_\-а-яА-ЯіІїЇєЄ]+$/.test(val))
      return setError(nickname, "err-nickname", "Лише літери, цифри, _ та -");
    return clearError(nickname, "err-nickname");
  }

  function validateEmail() {
    var val = email.value.trim();
    if (!val) return setError(email, "err-email", "Введіть email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
      return setError(email, "err-email", "Невірний формат email");
    return clearError(email, "err-email");
  }

  function validatePhone() {
    var val = phone.value.replace(/\s/g, "");
    if (!val) return setError(phone, "err-phone", "Введіть номер телефону");
    if (!/^\+?[0-9]{10,15}$/.test(val))
      return setError(
        phone,
        "err-phone",
        "Невірний формат. Приклад: +380671234567",
      );
    return clearError(phone, "err-phone");
  }

  function validatePassword() {
    var val = password.value;
    if (!val) return setError(password, "err-password", "Введіть пароль");
    if (val.length < 8)
      return setError(password, "err-password", "Мінімум 8 символів");
    return clearError(password, "err-password");
  }

  function validatePassword2() {
    var val = password2.value;
    if (!val) return setError(password2, "err-password2", "Підтвердіть пароль");
    if (val !== password.value)
      return setError(password2, "err-password2", "Паролі не співпадають");
    return clearError(password2, "err-password2");
  }

  // ---- phone formatter ----
  function formatPhone() {
    var raw = phone.value.replace(/[^\d+]/g, "");
    // +380 67 123 45 67
    if (raw.startsWith("+380") && raw.length <= 13) {
      var digits = raw.slice(4);
      var parts = ["+380"];
      if (digits.length > 0) parts.push(" " + digits.slice(0, 2));
      if (digits.length > 2) parts.push(" " + digits.slice(2, 5));
      if (digits.length > 5) parts.push(" " + digits.slice(5, 7));
      if (digits.length > 7) parts.push(" " + digits.slice(7, 9));
      phone.value = parts.join("");
    }
  }

  // ---- helpers ----
  function setError(input, errId, msg) {
    input.classList.add("form__input--error");
    input.classList.remove("form__input--ok");
    document.getElementById(errId).textContent = msg;
    return false;
  }

  function clearError(input, errId) {
    input.classList.remove("form__input--error");
    input.classList.add("form__input--ok");
    document.getElementById(errId).textContent = "";
    return true;
  }
});

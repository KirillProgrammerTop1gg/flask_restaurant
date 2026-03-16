document.addEventListener("DOMContentLoaded", function () {
  var bubble = document.getElementById("chatBubble");
  var window_ = document.getElementById("chatWindow");
  var closeBtn = document.getElementById("chatClose");
  var sendBtn = document.getElementById("chatSend");
  var input = document.getElementById("chatInput");
  var messages = document.getElementById("chatMessages");

  if (!bubble || !window_) return;

  // ----- open / close -----
  bubble.addEventListener("click", function () {
    var isOpen = window_.classList.toggle("chat-window--open");
    bubble.classList.toggle("chat-bubble--open", isOpen);
    if (isOpen) input.focus();
  });

  closeBtn.addEventListener("click", function () {
    window_.classList.remove("chat-window--open");
    bubble.classList.remove("chat-bubble--open");
  });

  // ----- send -----
  sendBtn.addEventListener("click", send);
  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") send();
  });

  function send() {
    var msg = input.value.trim();
    if (!msg) return;

    appendMessage(msg, "user");
    input.value = "";
    input.disabled = true;
    sendBtn.disabled = true;

    var typing = appendTyping();

    fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        typing.remove();
        var html =
          typeof marked !== "undefined"
            ? marked.parse(data.answer)
            : escapeHtml(data.answer);
        appendMessage(html, "bot", true);
      })
      .catch(function () {
        typing.remove();
        appendMessage("Виникла помилка. Спробуйте ще раз.", "bot");
      })
      .finally(function () {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
      });
  }

  function appendMessage(content, who, raw) {
    var div = document.createElement("div");
    div.className = "chat-msg chat-msg--" + who;
    var bubble = document.createElement("div");
    bubble.className = "chat-msg__bubble";
    if (raw) bubble.innerHTML = content;
    else bubble.textContent = content;
    div.appendChild(bubble);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function appendTyping() {
    var div = document.createElement("div");
    div.className = "chat-msg chat-msg--bot";
    div.innerHTML =
      '<div class="chat-msg__bubble chat-msg__typing"><span></span><span></span><span></span></div>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
});

document.addEventListener("DOMContentLoaded", function () {
  window.onload = function () {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (position) {
          document.getElementById("latitude").value = position.coords.latitude;
          document.getElementById("longitude").value =
            position.coords.longitude;
          console.log("Локацію отримано успішно.");
        },
        function (error) {
          console.error("Помилка геолокації:", error.message);
        },
      );
    }
  };
});

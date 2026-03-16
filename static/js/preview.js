document.addEventListener("DOMContentLoaded", function () {
  const imgInput = document.getElementById("img");
  const imgPreview = document.getElementById("imgPreview");
  const imgSrc = document.getElementById("imgPreviewSrc");

  imgInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imgSrc.src = e.target.result;
        imgPreview.classList.add("img-preview--visible");
      };
      reader.readAsDataURL(file);
    } else {
      imgSrc.src = "";
      imgPreview.classList.remove("img-preview--visible");
    }
  });
});

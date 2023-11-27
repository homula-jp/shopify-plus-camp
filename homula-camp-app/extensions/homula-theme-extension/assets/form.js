async function onSubmit(event) {
  event.preventDefault();
  const resultArea = document.querySelector("#result");
  const submitButton = document.querySelector(".submit-button");
  submitButton.classList.toggle("loading");
  resultArea.innerHTML = "";
  const formData = new FormData(event.currentTarget);

  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(Object.fromEntries(formData)),
  };

  const response = await fetch("/apps/homula-app/api/test", fetchOptions);
  const productName = (await response.json()).data.title;
  resultArea.innerHTML = `商品名：${productName}`;
  submitButton.classList.toggle("loading");
}

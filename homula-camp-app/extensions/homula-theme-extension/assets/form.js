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

  try {
    const response = await fetch("/apps/homula-app/api/test", fetchOptions);
    const result = await response.json();
    const productName = result.data.title;
    resultArea.innerHTML = `商品名：${productName}`;
  } catch (error) {
    console.log(error);
  } finally {
    submitButton.classList.toggle("loading");
  }
}

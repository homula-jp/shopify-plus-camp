async function onSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  console.log(formData.values());

  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData.values()),
  };

  const response = await fetch("/apps/homula-app/api/test", fetchOptions);
  console.log(response);
}

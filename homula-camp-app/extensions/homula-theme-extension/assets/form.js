async function onSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  console.log(Object.fromEntries(formData));

  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(Object.fromEntries(formData)),
  };

  const response = await fetch("/apps/homula-app/api/test", fetchOptions);
  console.log(response);
}

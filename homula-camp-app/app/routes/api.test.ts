import { json, type LoaderFunctionArgs } from "@remix-run/node";

export async function action({ request }: LoaderFunctionArgs) {
  const reader = request.body?.getReader();

  while (reader) {
    const { done, value } = await reader?.read();
    const decoder = new TextDecoder();
    const item = decoder.decode(value).replace(/\[|]/g, "").replace(/^,/, "");
    const parsedItem = JSON.parse(item);
    const row = document.createElement("tr");

    const idCell = document.createElement("td");
    const nameCell = document.createElement("td");
    const birthDateCell = document.createElement("td");

    idCell.innerHTML = parsedItem.id;
    nameCell.innerHTML = parsedItem.name;
    birthDateCell.innerHTML = parsedItem.birthDate;

    row.appendChild(idCell);
    row.appendChild(nameCell);
    row.appendChild(birthDateCell);
    table.appendChild(row);
  }
  debugger;
  return json(
    {
      data: {
        message: body,
      },
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      status: 200,
    }
  );
}

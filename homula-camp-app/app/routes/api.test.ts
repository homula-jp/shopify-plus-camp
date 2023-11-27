import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

async function getBody(request: Request) {
  const reader = request.body?.getReader();

  if (!reader) {
    return null;
  }

  const decoder = new TextDecoder();
  const chunks = [];

  while (true) {
    const { done, value } = await reader?.read();
    if (done) {
      return JSON.parse(chunks.join(""));
    }
    const chunk = decoder.decode(value);
    chunks.push(chunk);
  }
}

async function getProduct(request: Request, productId: string) {
  const { admin } = await authenticate.public.appProxy(request);
  const response = await admin
    ?.graphql(
      `#graphql
      query getProduct($input: ID!) {
        product(id: $input) {
          id
          createdAt
          title
          updatedAt
        }
      }
    `,
      {
        variables: {
          input: productId,
        },
      }
    )
    ?.catch((error) => {
      return null;
    });

  const responseJson = await response?.json();
  const product = responseJson?.data?.product;

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
}

export async function action({ request }: LoaderFunctionArgs) {
  const body = await getBody(request);
  const productId = body?.product_id;
  const product = await getProduct(
    request,
    `gid://shopify/Product/${productId}`
  );

  console.log(product);

  return json(
    {
      data: product,
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      status: 200,
    }
  );
}

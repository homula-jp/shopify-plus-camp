import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import type { Order } from "~/types/order";

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
  await authenticate.admin(loaderArgs.request);
  const { admin } = await authenticate.admin(loaderArgs.request);
  const response = await admin.graphql(
    `#graphql
      query getOrder {
        order(id) {
          id
          createdAt
          displayFulfillmentStatus
          name
          note
          updatedAt
          customAttributes {
            key
            value
          }
          customer {
            displayName
          }
          lineItems(first: 20) {
            nodes {
              customAttributes {
                key
                value
              }
            }
          }
        }
      }
    `
  );

  const responseJson = await response.json();

  return {
    order: responseJson.data as Order,
  };
};

export default function Test() {
  return {
    test: "test",
  };
}

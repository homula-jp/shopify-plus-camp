import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import type { SubmitFunction } from "@remix-run/react";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import { Page, Layout, Text, Card, BlockStack, Box } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { OrderList } from "~/components/OrderList";
import type { Order } from "~/types/order";
import type { Data } from "~/types/remix";

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
  await authenticate.admin(loaderArgs.request);

  return json(await getOrderList(loaderArgs));
};

export const getOrderList = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      query getOrders {
        orders(first: 20, query: "fulfillment_status:unshipped") {
          nodes {
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
      }
    `
  );

  const responseJson = await response.json();

  return {
    // orders: (responseJson.data.orders.nodes as Order[]).filter(
    //   ({ customAttributes }) =>
    //     customAttributes.find(({ key }) => key === "Engraving")
    // ),
    orders: responseJson.data.orders.nodes as Order[],
  };
};

export const updateOrder = async ({
  request,
  params,
}: {
  request: ActionFunctionArgs["request"];
  context: ActionFunctionArgs["context"];
  params: {
    id: Order["id"];
    customAttributes: Order["customAttributes"];
  };
}) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      mutation orderUpdate($input: OrderInput!) {
        orderUpdate(input: $input) {
          order {
            id
            createdAt
            customAttributes {
              key
              value
            }
            displayFulfillmentStatus
            name
            note
            customer {
              displayName
            }
            updatedAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        input: {
          id: params.id,
          customAttributes: [
            ...params.customAttributes,
            {
              key: "EngravingCompleted",
              value: "true",
            },
          ],
        },
      },
    }
  );

  const responseJson = await response.json();

  return json(responseJson.data.orderUpdate.order as Order);
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.clone().formData();
  const _action = formData.get("_action");

  if (_action === "UPDATE") {
    const newOrders = (formData.getAll("orders[]") as string[]).map((data) =>
      JSON.parse(data)
    ) as {
      id: Order["id"];
      customAttributes: Order["customAttributes"];
    }[];
    const result = await Promise.all(
      newOrders.map(async ({ id, customAttributes }) => {
        const response = await updateOrder({
          request,
          params: { id, customAttributes },
          context,
        });

        return response.json();
      })
    );

    return json({
      orders: result,
    });
  }
};

export default function Index() {
  const nav = useNavigation();
  const data = useLoaderData<typeof loader>() as Data<typeof loader>;
  const actionData = useActionData<typeof action>() as Data<typeof action>;
  const submit = useSubmit();
  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

  const submitAction = (target: Parameters<SubmitFunction>[0]) =>
    submit(target, { replace: true, method: "POST" });

  return (
    <Page>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    刻印ありの注文管理
                  </Text>
                  <Text variant="bodyMd" as="p">
                    刻印ありで注文された商品を一覧表示します。
                    <br />
                    刻印作業の進捗を管理することができます。
                  </Text>
                </BlockStack>
                <BlockStack gap="200">
                  <OrderList
                    isLoading={isLoading}
                    submitAction={submitAction}
                    orders={data.orders}
                  />
                </BlockStack>
                {actionData && actionData?.orders.length > 0 && (
                  <Box
                    padding="400"
                    background="bg-surface-active"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor="border"
                    overflowX="scroll"
                  >
                    <ul>
                      {actionData.orders.map((order) => (
                        <li key={order.id}>
                          <Text fontWeight="bold" as="span">
                            {order.name}
                          </Text>
                          を刻印済みにしました。
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

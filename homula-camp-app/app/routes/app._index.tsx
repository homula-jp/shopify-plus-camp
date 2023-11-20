import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { OrderList } from "~/components/OrderList";

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
  await authenticate.admin(loaderArgs.request);

  return json(await getOrderList(loaderArgs));
};

export const getOrderList = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      query getOrders {
        orders(first: 100, query: "fulfillment_status:unshipped") {
          nodes {
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
        }
      }
    `
  );

  const responseJson = await response.json();

  return {
    orders: responseJson.data.orders.nodes.filter(({ customAttributes }: any) =>
      customAttributes.find(({ key }: any) => key === "Engraving")
    ),
  };
};

export const updateOrder = async ({ request, params }: ActionFunctionArgs) => {
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
          customAttributes: {
            key: "CompleteEngraving",
            value: true,
          },
        },
      },
    }
  );

  const responseJson = await response.json();

  return json({
    order: responseJson.data.orderUpdate.order,
  });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.clone().formData();
  const _action = formData.get("_action");

  if (_action === "UPDATE") {
    return await updateOrder({
      request,
      params: { id: formData.get("id") as string },
      context,
    });
  }

  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        input: {
          title: `${color} Snowboard`,
          variants: [{ price: Math.random() * 100 }],
        },
      },
    }
  );
  const responseJson = await response.json();

  return await json({
    product: responseJson.data.productCreate.product,
  });
};

export default function Index() {
  const nav = useNavigation();
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";
  const productId = actionData?.product?.id.replace(
    "gid://shopify/Product/",
    ""
  );

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId]);
  const submitAction = () => submit({}, { replace: true, method: "POST" });

  return (
    <Page>
      <ui-title-bar title="Homula Camp App">
        <button variant="primary" onClick={submitAction}>
          Generate a product
        </button>
      </ui-title-bar>
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
                  <OrderList orders={data.orders} />
                </BlockStack>
                <InlineStack gap="300">
                  <Button
                    loading={isLoading}
                    onClick={submitAction}
                    name="_action"
                    value="UPDATE"
                  >
                    刻印完了
                  </Button>
                  {actionData?.product && (
                    <Button
                      url={`shopify:admin/products/${productId}`}
                      target="_blank"
                      variant="plain"
                    >
                      View product
                    </Button>
                  )}
                </InlineStack>
                {actionData?.product && (
                  <Box
                    padding="400"
                    background="bg-surface-active"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor="border"
                    overflowX="scroll"
                  >
                    <pre style={{ margin: 0 }}>
                      <code>{JSON.stringify(actionData.product, null, 2)}</code>
                    </pre>
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

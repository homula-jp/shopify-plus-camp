import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import type { SubmitFunction } from "@remix-run/react";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import {
  Page,
  Button,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  IndexTable,
  Text,
  useIndexResourceState,
  Form,
} from "@shopify/polaris";
import dayjs from "dayjs";
import { useCallback, useMemo } from "react";
import { authenticate } from "~/shopify.server";
import type { Order } from "~/types/order";
import type { Data } from "~/types/remix";

export const getOrderList = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      query getOrders {
        orders(first: 20) {
          nodes {
            id
            createdAt
            name
            updatedAt
            displayFulfillmentStatus
            fulfillmentOrders(first: 20) {
              edges {
                node {
                  id
                  createdAt
                  updatedAt
                  fulfillAt
                  fulfillBy
                  orderId
                  orderName
                  status
                  requestStatus
                }
              }
            }
            transactions(first: 20) {
              id
              status
              gateway
              formattedGateway
              kind
              manuallyCapturable
              amountSet {
                presentmentMoney {
                  amount
                  currencyCode
                }
              }
              paymentDetails {
                ... on CardPaymentDetails {
                  avsResultCode
                  bin
                  company
                  cvvResultCode
                  expirationMonth
                  expirationYear
                  name
                  number
                  paymentMethodName
                  wallet
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
    orders: responseJson.data.orders.nodes as Order[],
  };
};

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
  await authenticate.admin(loaderArgs.request);

  return json(await getOrderList(loaderArgs));
};

export const fulfillOrder = async ({
  request,
  params,
}: {
  request: ActionFunctionArgs["request"];
  context: ActionFunctionArgs["context"];
  params: {
    id: Order["id"];
  };
}) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
        fulfillmentCreateV2(fulfillment: $fulfillment) {
          fulfillment {
            id
            name
            status
            fulfillmentOrders(first: 3, reverse: true) {
              edges {
                node {
                  id
                  createdAt
                  status
                  requestStatus
                }
              }
            }
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
        fulfillment: {
          lineItemsByFulfillmentOrder: {
            fulfillmentOrderId: params.id,
          },
        },
      },
    }
  );

  const responseJson = await response.json();

  return json(responseJson.data.fulfillmentCreateV2.fulfillment);
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.clone().formData();
  const _action = formData.get("_action");

  if (_action === "FULFILL_ORDER") {
    const targets = (formData.getAll("fulfillmentOrders[]") as string[]).map(
      (data) => JSON.parse(data)
    ) as {
      id: Order["id"];
    }[];
    const result = await Promise.all(
      targets.map(async ({ id }) => {
        const response = await fulfillOrder({
          request,
          params: { id },
          context,
        });

        return response.json();
      })
    );

    return json({
      fulfillments: result,
    });
  }
};

export default function Index() {
  const data = useLoaderData<typeof loader>() as Data<typeof loader>;
  const orders = useMemo(() => data.orders, [data.orders]);
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(
      orders.flatMap(({ fulfillmentOrders }) =>
        fulfillmentOrders.edges.map(({ node }) => node)
      ) as unknown as Parameters<typeof useIndexResourceState>[0]
    );
  const actionData = useActionData<typeof action>() as Data<typeof action>;
  const nav = useNavigation();
  const submit = useSubmit();
  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";
  const submitAction = (target: Parameters<SubmitFunction>[0]) =>
    submit(target, { replace: true, method: "POST" });

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);

      selectedResources
        .map(
          (fullfillmentOrderId) =>
            orders.find(({ fulfillmentOrders }) =>
              fulfillmentOrders.edges.find(
                ({ node: { id } }) => fullfillmentOrderId === id
              )
            )!
        )
        .filter(({ fulfillmentOrders }) => {
          const completed = fulfillmentOrders.edges.find(
            ({ node: { status } }) => status !== "OPEN"
          );
          return !completed;
        })
        .forEach((fulfillmentOrderId) => {
          formData.append(
            "fulfillmentOrders[]",
            JSON.stringify({
              id: fulfillmentOrderId,
            })
          );
        });
      submitAction(formData);
    },
    [orders, selectedResources]
  );

  return (
    <Page>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Form onSubmit={onSubmit}>
                  <InlineStack gap="300">Fulfillment</InlineStack>
                  <IndexTable
                    itemCount={orders.reduce(
                      (prev, order) =>
                        order.fulfillmentOrders.edges.length + prev,
                      0
                    )}
                    headings={[
                      { title: "注文", alignment: "start" },
                      { title: "fulfillAt" },
                      { title: "requestStatus" },
                      { title: "status" },
                    ]}
                    selectedItemsCount={
                      allResourcesSelected ? "All" : selectedResources.length
                    }
                    onSelectionChange={handleSelectionChange}
                  >
                    {orders.map((order, index) => {
                      return order.fulfillmentOrders.edges.map(
                        ({ node: fulfillmentOrder }) => {
                          const completed = fulfillmentOrder.status !== "OPEN";
                          return (
                            <IndexTable.Row
                              key={fulfillmentOrder.id}
                              id={fulfillmentOrder.id}
                              position={index}
                              selected={
                                !completed &&
                                selectedResources.includes(fulfillmentOrder.id)
                              }
                              disabled={completed}
                            >
                              <IndexTable.Cell>
                                <Text
                                  variant="bodyMd"
                                  fontWeight="bold"
                                  as="span"
                                >
                                  {order?.name}
                                </Text>
                              </IndexTable.Cell>
                              <IndexTable.Cell>
                                {dayjs(fulfillmentOrder.fulfillAt).format(
                                  "YYYY/MM/DD HH:mm:ss"
                                )}
                              </IndexTable.Cell>
                              <IndexTable.Cell>
                                {fulfillmentOrder.requestStatus}
                              </IndexTable.Cell>
                              <IndexTable.Cell>
                                {fulfillmentOrder.status}
                              </IndexTable.Cell>
                            </IndexTable.Row>
                          );
                        }
                      );
                    })}
                  </IndexTable>
                  <InlineStack gap="300">
                    <input type="hidden" name="_action" value="FULFILL_ORDER" />
                    <Button
                      submit
                      disabled={selectedResources.length === 0 || isLoading}
                      loading={isLoading}
                    >
                      発送する
                    </Button>
                  </InlineStack>
                </Form>
              </BlockStack>
            </Card>
          </Layout.Section>
          {actionData?.fulfillments?.length && (
            <Layout.Section>
              <Card>
                <BlockStack gap="500">
                  <Text as="h2" variant="headingMd">
                    発送結果
                  </Text>
                  {actionData.fulfillments.map((fulfillment) => (
                    <InlineStack gap="300" key={fulfillment.id}>
                      <Text as="p" variant="headingMd">
                        {fulfillment.name}
                      </Text>
                      <Text as="p" variant="bodyMd">
                        {fulfillment.status}
                      </Text>
                    </InlineStack>
                  ))}
                </BlockStack>
              </Card>
            </Layout.Section>
          )}
        </Layout>
      </BlockStack>
    </Page>
  );
}

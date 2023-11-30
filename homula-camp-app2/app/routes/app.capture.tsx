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
import type { Order, Transaction } from "~/types/order";
import type { Data } from "~/types/remix";

export const getOrderList = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      query getOrders {
        orders(first: 20, query: "fulfillment_status:unshipped") {
          nodes {
            id
            capturable
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

type CaptureOrderParams = {
  id: Transaction["id"];
  orderId: Order["id"];
  amount: Transaction["amountSet"]["presentmentMoney"]["amount"];
  parentTransactionId: Transaction["id"];
};

export const captureOrder = async ({
  request,
  params,
}: {
  request: ActionFunctionArgs["request"];
  context: ActionFunctionArgs["context"];
  params: CaptureOrderParams;
}) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      mutation orderCapture($input: OrderCaptureInput!) {
        orderCapture(input: $input) {
          transaction {
            id
            status
            gateway
            kind
            amountSet {
              presentmentMoney {
                amount
                currencyCode
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
        input: {
          id: params.orderId,
          amount: params.amount,
          parentTransactionId: params.parentTransactionId,
        },
      },
    }
  );

  const responseJson = await response.json();

  return json(responseJson.data.orderCapture);
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.clone().formData();
  const _action = formData.get("_action");

  if (_action === "FULFILL_ORDER") {
    const targets = (formData.getAll("transactions[]") as string[]).map(
      (data) => JSON.parse(data)
    ) as CaptureOrderParams[];
    const result = await Promise.all(
      targets.map(async (params) => {
        const response = await captureOrder({
          request,
          params,
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
  const data = useLoaderData<typeof loader>() as Data<typeof loader>;
  const transactions = useMemo(
    () =>
      data.orders.flatMap((order) =>
        order.transactions.map((transaction) => ({
          id: transaction.id,
          orderId: order.id,
          orderName: order.name,
          orderCreatedAt: order.createdAt,
          capturable: order.capturable,
          kind: transaction.kind,
          amount: transaction.amountSet.presentmentMoney.amount,
          parentTransactionId: transaction.id,
          gateway: transaction.formattedGateway,
          status: transaction.status,
        }))
      ),
    [data.orders]
  );
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(
      transactions as unknown as Parameters<typeof useIndexResourceState>[0]
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
      selectedResources.forEach((transactionId) => {
        const transaction = transactions.find(({ id }) => id === transactionId);
        formData.append(
          "transactions[]",
          JSON.stringify({
            id: transaction?.id,
            orderId: transaction?.orderId,
            amount: transaction?.amount,
            parentTransactionId: transaction?.parentTransactionId,
          })
        );
      });
      submitAction(formData);
    },
    [transactions, selectedResources]
  );

  return (
    <Page>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Form onSubmit={onSubmit}>
                  <InlineStack gap="300">Capture</InlineStack>
                  <IndexTable
                    itemCount={transactions.length}
                    headings={[
                      { title: "注文", alignment: "start" },
                      { title: "注文日" },
                      { title: "capturable" },
                      { title: "kind" },
                      { title: "amount" },
                      { title: "gateway" },
                      { title: "status" },
                    ]}
                    selectedItemsCount={
                      allResourcesSelected ? "All" : selectedResources.length
                    }
                    onSelectionChange={handleSelectionChange}
                  >
                    {transactions.map((transaction, index) => (
                      <IndexTable.Row
                        key={transaction.id}
                        id={transaction.id}
                        position={index}
                        selected={selectedResources.includes(transaction.id)}
                      >
                        <IndexTable.Cell>
                          <Text variant="bodyMd" fontWeight="bold" as="span">
                            {transaction.orderName}
                          </Text>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          {dayjs(transaction.orderCreatedAt).format(
                            "YYYY/MM/DD HH:mm:ss"
                          )}
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          {String(transaction.capturable)}
                        </IndexTable.Cell>
                        <IndexTable.Cell>{transaction.kind}</IndexTable.Cell>
                        <IndexTable.Cell>{transaction.amount}</IndexTable.Cell>
                        <IndexTable.Cell>{transaction.gateway}</IndexTable.Cell>
                        <IndexTable.Cell>{transaction.status}</IndexTable.Cell>
                      </IndexTable.Row>
                    ))}
                  </IndexTable>
                  <InlineStack gap="300">
                    <input type="hidden" name="_action" value="FULFILL_ORDER" />
                    <Button
                      submit
                      disabled={selectedResources.length === 0 || isLoading}
                      loading={isLoading}
                    >
                      キャプチャ
                    </Button>
                  </InlineStack>
                </Form>
              </BlockStack>
            </Card>
          </Layout.Section>
          {actionData?.orders?.length && (
            <Layout.Section>
              <Card>
                <BlockStack gap="500">
                  <Text as="h2" variant="headingMd">
                    キャプチャ結果
                  </Text>
                  {actionData.orders.map((order) =>
                    order.transaction ? (
                      <InlineStack gap="300" key={order.transaction.id}>
                        <Text as="p" variant="headingMd">
                          {order.transaction.amountSet.paresentmentMoney.amount}
                        </Text>
                        <Text as="p" variant="bodyMd">
                          {order.transaction.kind}
                        </Text>
                        <Text as="p" variant="bodyMd">
                          {order.transaction.status}
                        </Text>
                      </InlineStack>
                    ) : (
                      <InlineStack gap="300" key={order.userErrors[0].message}>
                        <Text as="p" variant="bodyMd">
                          {order.userErrors[0].message}
                        </Text>
                      </InlineStack>
                    )
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          )}
        </Layout>
      </BlockStack>
    </Page>
  );
}

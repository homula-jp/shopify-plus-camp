import React, { useCallback } from "react";
import {
  BlockStack,
  Button,
  Form,
  IndexTable,
  InlineStack,
  Text,
  useIndexResourceState,
} from "@shopify/polaris";
import dayjs from "dayjs";
import type { SubmitFunction } from "@remix-run/react";
import type { Order } from "~/types/order";

type OrderListProps = {
  isLoading: boolean;
  submitAction: (target: Parameters<SubmitFunction>[0]) => void;
  orders: Order[];
};

export const OrderList: React.FC<OrderListProps> = ({
  isLoading,
  submitAction,
  orders,
}) => {
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(
      orders as unknown as Parameters<typeof useIndexResourceState>[0]
    );

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      selectedResources.forEach((id) => {
        const order = orders.find((order) => order.id === id);
        formData.append(
          "orders[]",
          JSON.stringify({ id, customAttributes: order?.customAttributes })
        );
      });
      submitAction(formData);
    },
    [selectedResources]
  );

  return (
    <Form onSubmit={onSubmit}>
      <BlockStack gap="200">
        <IndexTable
          itemCount={orders.length}
          headings={[
            { title: "注文" },
            { title: "注文作成日時" },
            { title: "顧客" },
            { title: "刻印" },
            { title: "刻印済み" },
          ]}
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
        >
          {orders.map((order, index) => {
            const engravingText = order.lineItems.nodes.map(
              ({ customAttributes }) =>
                customAttributes.find(({ key }) => key === "EngravingText")
                  ?.value
            );
            const completed =
              order.customAttributes.find(
                ({ key }) => key === "EngravingCompleted"
              )?.value === "true";

            return (
              <IndexTable.Row
                key={order.id}
                id={order.id}
                position={index}
                selected={completed || selectedResources.includes(order.id)}
                disabled={completed}
              >
                <IndexTable.Cell>
                  <Text variant="bodyMd" fontWeight="bold" as="span">
                    {order.name}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  {dayjs(order.createdAt).format("YYYY/MM/DD HH:mm:ss")}
                </IndexTable.Cell>
                <IndexTable.Cell>{order.customer.displayName}</IndexTable.Cell>
                <IndexTable.Cell>{engravingText.join(", ")}</IndexTable.Cell>
                <IndexTable.Cell>{completed ? "済" : "未"}</IndexTable.Cell>
              </IndexTable.Row>
            );
          })}
        </IndexTable>
        <InlineStack gap="300">
          <input type="hidden" name="_action" value="UPDATE" />
          <Button
            submit
            disabled={selectedResources.length === 0 || isLoading}
            loading={isLoading}
          >
            刻印完了
          </Button>
        </InlineStack>
      </BlockStack>
    </Form>
  );
};

import React from "react";
import { IndexTable, Text, useIndexResourceState } from "@shopify/polaris";

type OrderListProps = {
  orders: any[];
};

export const OrderList: React.FC<OrderListProps> = ({ orders }) => {
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(orders);
  return (
    <IndexTable
      itemCount={orders.length}
      headings={[
        { title: "注文" },
        { title: "注文作成日" },
        { title: "顧客" },
        { title: "刻印" },
      ]}
      selectedItemsCount={
        allResourcesSelected ? "All" : selectedResources.length
      }
      onSelectionChange={handleSelectionChange}
    >
      {orders.map((order, index) => (
        <IndexTable.Row
          key={order.id}
          id={order.id}
          position={index}
          selected={selectedResources.includes(order.id)}
        >
          <IndexTable.Cell>
            <Text variant="bodyMd" fontWeight="bold" as="span">
              {order.name}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>{order.createdAt}</IndexTable.Cell>
          <IndexTable.Cell>{order.customer.displayName}</IndexTable.Cell>
          <IndexTable.Cell>
            {
              order.customAttributes.find(({ key }: any) => key === "Engraving")
                ?.value
            }
          </IndexTable.Cell>
        </IndexTable.Row>
      ))}
    </IndexTable>
  );
};

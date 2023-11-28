export interface Order {
  id: string;
  createdAt: string;
  displayFulfillmentStatus: string;
  name: string;
  updatedAt: string;
  fulfillmentOrders: FulfillmentOrders;
}

interface FulfillmentOrders {
  edges: {
    node: FulfillmentOrderNode;
  }[];
}

interface FulfillmentOrderNode {
  id: string;
  createdAt: string;
  updatedAt: string;
  fulfillAt: string;
  fulfillBy: string;
  orderId: string;
  orderName: string;
  status: string;
  requestStatus: string;
}

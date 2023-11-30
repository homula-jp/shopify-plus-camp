export interface Order {
  id: string;
  capturable: boolean;
  createdAt: string;
  displayFulfillmentStatus: string;
  name: string;
  updatedAt: string;
  fulfillmentOrders: FulfillmentOrders;
  transactions: Transaction[];
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

export interface Transaction {
  id: string;
  status: string;
  gateway: string;
  formattedGateway: string;
  kind: string;
  manuallyCapturable: boolean;
  amountSet: {
    presentmentMoney: {
      amount: number;
      currencyCode: string;
    };
  };
  paymentDetails: {
    avsResultCode: string;
    bin: string;
    company: string;
    cvvResultCode: string;
    expirationMonth: string;
    expirationYear: string;
    name: string;
    number: string;
    paymentMethodName: string;
    wallet: string;
  };
}

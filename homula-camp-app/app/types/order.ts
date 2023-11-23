export interface Order {
  id: string;
  createdAt: string;
  displayFulfillmentStatus: string;
  name: string;
  note?: any;
  updatedAt: string;
  customAttributes: CustomAttribute[];
  customer: Customer;
  lineItems: LineItems;
}

interface LineItems {
  nodes: Node[];
}

interface Node {
  customAttributes: CustomAttribute[];
}

interface Customer {
  displayName: string;
}

interface CustomAttribute {
  key: string;
  value: string;
}

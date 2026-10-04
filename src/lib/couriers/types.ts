// Courier integration contract (not wired up yet).
//
// Order data lives in the browser, but courier API keys must stay on the
// server. To add Steadfast later:
//   1. implement CourierProvider in ./steadfast.ts using STEADFAST_API_KEY / STEADFAST_SECRET_KEY
//   2. register it in ./index.ts under the same name used in Settings -> Couriers
//   3. add a server action that receives the order from the browser, calls
//      provider.createConsignment(order) and returns the result
//   4. save the result on the order in the browser (consignment_id / tracking_code)
import type { OrderWithItems } from "../types";

export type ConsignmentResult = {
  consignmentId: string;
  trackingCode: string;
  status?: string;
};

export interface CourierProvider {
  /** Must match the courier name stored on the order (e.g. "Steadfast"). */
  name: string;
  isConfigured(): boolean;
  createConsignment(order: OrderWithItems): Promise<ConsignmentResult>;
}

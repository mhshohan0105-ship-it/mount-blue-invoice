import type { CourierProvider } from "./types";

// Register courier API providers here, e.g. `steadfast` from "./steadfast".
const providers: CourierProvider[] = [];

export function getCourierProvider(courierName: string): CourierProvider | undefined {
  return providers.find((p) => p.name.toLowerCase() === courierName.toLowerCase() && p.isConfigured());
}

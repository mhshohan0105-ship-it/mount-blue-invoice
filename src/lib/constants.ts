import type { Settings } from "./types";

export const PAGE_SIZE = 50;

export const DEFAULT_SETTINGS: Settings = {
  shop_name: "MOUNT BLUE",
  address: "Mukto Bangla Shopping Complex, 2nd Floor, Shop 273, 274, Mazar Road, Mirpur 1, Dhaka",
  phone: "01755990789",
  logo_data: null,
  footer_text: "Thank you for shopping with Mount Blue",
  facebook_url: "facebook.com/mountblue",
  delivery_zones: [
    { name: "Inside Dhaka", charge: 70 },
    { name: "Outside Dhaka", charge: 130 },
  ],
  couriers: ["Steadfast", "Pathao", "RedX"],
  add_delivery_to_cod: true,
  memo_color: "#0a0a0a",
  memo_color2: null,
};

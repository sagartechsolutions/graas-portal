import type { Term } from "@/lib/data";

export const rupees = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n));

/** Same arithmetic as the database quote: the yearly fee times the years, less the length discount. */
export function termPrice(priceInr: number, t: Term) {
  const full = Math.round(priceInr * 100) * t.years;
  return (full - Math.round((full * Number(t.discount_percent)) / 100)) / 100;
}

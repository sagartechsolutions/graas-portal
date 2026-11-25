const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "24 November 2026", in Indian time, without depending on the server's locale data. */
export function longDate(iso: string) {
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** A stored phone number for display: Indian mobiles as "+91 98765 43210", others as "+44 7700900123". */
export function phoneText(phone: string | null | undefined) {
  const d = String(phone ?? "");
  if (!d) return "";
  if (/^[6-9][0-9]{9}$/.test(d)) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  return `+${d}`;
}
/** A tel: link for a stored phone number. */
export function phoneHref(phone: string | null | undefined) {
  const d = String(phone ?? "");
  return /^[6-9][0-9]{9}$/.test(d) ? `tel:+91${d}` : `tel:+${d}`;
}
/** What a member typed, as it is stored: Indian mobiles as 10 digits, other countries with the country code. */
export function normPhone(raw: string | null | undefined) {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (/^(91|0)[6-9][0-9]{9}$/.test(d)) return d.slice(-10);
  return d.slice(0, 15);
}
